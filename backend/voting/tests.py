import json
import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import Client, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Candidate, Election, Vote


class VotingApiTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.voter = get_user_model().objects.create_user(username="voter", password="TestPass123!")
        self.admin = get_user_model().objects.create_user(username="admin", password="TestPass123!", is_staff=True)
        self.election = Election.objects.create(
            title="Class Representative",
            starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(hours=1),
            is_published=True,
        )
        self.alex = Candidate.objects.create(election=self.election, name="Alex")
        self.sam = Candidate.objects.create(election=self.election, name="Sam")
        self.client = APIClient()
        self.client.force_authenticate(user=self.voter)

    def vote_url(self, election=None):
        return f"/api/elections/{(election or self.election).id}/vote/"

    def test_cast_vote_and_show_voted_status(self):
        response = self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json")
        self.assertEqual(response.status_code, 201)
        vote = Vote.objects.get(voter=self.voter, election=self.election)
        self.assertEqual(vote.candidate, self.alex)
        detail = self.client.get(f"/api/elections/{self.election.id}/")
        self.assertTrue(detail.data["has_voted"])

    def test_candidate_photo_url_is_exposed_or_null(self):
        gif = b"GIF89a"  # content is not validated when saving through the model
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            self.alex.photo = SimpleUploadedFile("alex.gif", gif, content_type="image/gif")
            self.alex.save()
            detail = self.client.get(f"/api/elections/{self.election.id}/")
        photos = {candidate["name"]: candidate["photo"] for candidate in detail.data["candidates"]}
        self.assertRegex(photos["Alex"], r"^http://testserver/media/candidates/alex.*\.gif$")
        self.assertIsNone(photos["Sam"])

    def test_second_vote_is_rejected_and_original_remains(self):
        self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json")
        response = self.client.post(self.vote_url(), {"candidate_id": self.sam.id}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Vote.objects.filter(voter=self.voter, election=self.election).count(), 1)
        self.assertEqual(Vote.objects.get(voter=self.voter).candidate, self.alex)

    def test_database_also_prevents_duplicate_votes(self):
        Vote.objects.create(voter=self.voter, election=self.election, candidate=self.alex)
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Vote.objects.create(voter=self.voter, election=self.election, candidate=self.sam)

    def test_missing_or_foreign_candidate_is_rejected(self):
        self.assertEqual(self.client.post(self.vote_url(), {}, format="json").status_code, 400)
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": -1}, format="json").status_code, 400)
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": "not-a-number"}, format="json").status_code, 400)
        other = Election.objects.create(
            title="Other", starts_at=timezone.now() - timedelta(hours=1),
            ends_at=timezone.now() + timedelta(hours=1), is_published=True,
        )
        outsider = Candidate.objects.create(election=other, name="Taylor")
        response = self.client.post(self.vote_url(), {"candidate_id": outsider.id}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Vote.objects.exists())

    def test_upcoming_and_closed_elections_reject_votes(self):
        self.election.starts_at = timezone.now() + timedelta(hours=1)
        self.election.ends_at = timezone.now() + timedelta(hours=2)
        self.election.save()
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json").status_code, 400)
        self.election.starts_at = timezone.now() - timedelta(hours=2)
        self.election.ends_at = timezone.now() - timedelta(hours=1)
        self.election.save()
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json").status_code, 400)

    def test_results_hidden_until_closed_then_counted(self):
        results_url = f"/api/elections/{self.election.id}/results/"
        self.assertEqual(self.client.get(results_url).status_code, 403)
        Vote.objects.create(voter=self.voter, election=self.election, candidate=self.alex)
        self.election.ends_at = timezone.now() - timedelta(seconds=1)
        self.election.save()
        response = self.client.get(results_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_votes"], 1)
        totals = {item["name"]: item["votes"] for item in response.data["candidates"]}
        self.assertEqual(totals, {"Alex": 1, "Sam": 0})

    def test_unpublished_elections_are_hidden(self):
        self.election.is_published = False
        self.election.save()
        self.assertEqual(self.client.get(f"/api/elections/{self.election.id}/").status_code, 404)
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json").status_code, 404)

    def test_staff_and_anonymous_users_cannot_vote(self):
        self.client.force_authenticate(user=self.admin)
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json").status_code, 403)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json").status_code, 403)
        self.assertFalse(Vote.objects.exists())

    def test_inactive_voter_cannot_vote(self):
        self.voter.is_active = False
        self.voter.save()
        self.assertEqual(self.client.post(self.vote_url(), {"candidate_id": self.alex.id}, format="json").status_code, 403)
        self.assertFalse(Vote.objects.exists())

    def test_invalid_election_window_fails_model_validation(self):
        self.election.ends_at = self.election.starts_at
        with self.assertRaises(ValidationError):
            self.election.full_clean()


class SessionAuthTests(TestCase):
    def test_malformed_login_json_returns_validation_error(self):
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/auth/csrf/").json()["csrfToken"]
        response = client.post(
            "/api/auth/login/", "{broken json", content_type="application/json", HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["detail"], "Send a valid JSON body.")

    def test_login_requires_csrf_then_vote_uses_session(self):
        user = get_user_model().objects.create_user(username="student", password="TestPass123!")
        now = timezone.now()
        election = Election.objects.create(
            title="Class Election", starts_at=now - timedelta(hours=1),
            ends_at=now + timedelta(hours=1), is_published=True,
        )
        candidate = Candidate.objects.create(election=election, name="Jordan")
        client = Client(enforce_csrf_checks=True)
        token = client.get("/api/auth/csrf/").json()["csrfToken"]
        credentials = json.dumps({"username": user.username, "password": "TestPass123!"})
        self.assertEqual(client.post("/api/auth/login/", credentials, content_type="application/json").status_code, 403)
        login_response = client.post(
            "/api/auth/login/", credentials, content_type="application/json", HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(login_response.status_code, 200)
        self.assertTrue(client.get("/api/auth/me/").json()["authenticated"])
        token = client.get("/api/auth/csrf/").json()["csrfToken"]
        ballot = json.dumps({"candidate_id": candidate.id})
        self.assertEqual(client.post(f"/api/elections/{election.id}/vote/", ballot, content_type="application/json").status_code, 403)
        vote_response = client.post(
            f"/api/elections/{election.id}/vote/", ballot,
            content_type="application/json", HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(vote_response.status_code, 201)
        self.assertEqual(Vote.objects.filter(voter=user, election=election).count(), 1)
