from django.db import IntegrityError, transaction
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Candidate, Vote


def cast_vote(*, voter, election, candidate_id):
    """Validate and record a ballot. The DB constraint handles concurrent retries."""
    if not (voter.is_authenticated and voter.is_active and not voter.is_staff):
        raise PermissionDenied("Only active voter accounts can vote.")
    if not election.is_open_for_voting:
        raise ValidationError({"detail": "This election is not open for voting."})

    candidate = Candidate.objects.filter(id=candidate_id, election=election).first()
    if candidate is None:
        raise ValidationError({"candidate_id": "Choose a candidate in this election."})
    if Vote.objects.filter(voter=voter, election=election).exists():
        raise ValidationError({"detail": "You have already voted in this election."})

    try:
        with transaction.atomic():
            return Vote.objects.create(voter=voter, election=election, candidate=candidate)
    except IntegrityError as exc:
        if Vote.objects.filter(voter=voter, election=election).exists():
            raise ValidationError({"detail": "You have already voted in this election."}) from exc
        raise
