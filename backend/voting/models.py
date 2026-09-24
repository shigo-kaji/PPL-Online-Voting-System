from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.utils import timezone


class Election(models.Model):
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_published = models.BooleanField(default=False)

    class Meta:
        ordering = ["-starts_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=Q(ends_at__gt=F("starts_at")), name="election_ends_after_start"),
        ]

    def clean(self):
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "The closing time must be after the opening time."})

    @property
    def status(self):
        now = timezone.now()
        if now < self.starts_at:
            return "upcoming"
        if now >= self.ends_at:
            return "closed"
        return "open"

    @property
    def is_open_for_voting(self):
        """The Boolean rule used when a voter submits a ballot."""
        return self.is_published and self.starts_at <= timezone.now() < self.ends_at

    def __str__(self):
        return self.title


class Candidate(models.Model):
    election = models.ForeignKey(Election, related_name="candidates", on_delete=models.CASCADE)
    name = models.CharField(max_length=120)
    statement = models.TextField(blank=True)
    photo = models.ImageField(upload_to="candidates/", blank=True)
    summary = models.TextField(blank=True, help_text="Short introduction shown at the top of the candidate profile.")
    bio = models.TextField(
        "More about", blank=True, help_text="Longer profile text. Leave a blank line between paragraphs.",
    )

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["election", "name"], name="unique_candidate_name_per_election"),
        ]

    def __str__(self):
        return f"{self.name} ({self.election.title})"


class CandidateGalleryImage(models.Model):
    candidate = models.ForeignKey(Candidate, related_name="gallery", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="candidates/gallery/")
    caption = models.CharField(max_length=120, blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.caption or f"Image #{self.pk}"


class CandidateLink(models.Model):
    class Platform(models.TextChoices):
        INSTAGRAM = "instagram", "Instagram"
        FACEBOOK = "facebook", "Facebook"
        X = "x", "X / Twitter"
        TIKTOK = "tiktok", "TikTok"
        YOUTUBE = "youtube", "YouTube"
        LINKEDIN = "linkedin", "LinkedIn"
        WEBSITE = "website", "Website"

    candidate = models.ForeignKey(Candidate, related_name="links", on_delete=models.CASCADE)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    url = models.URLField("URL")
    label = models.CharField(max_length=60, blank=True, help_text='Short subtitle, e.g. "Campaign updates".')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.get_platform_display()}: {self.url}"


class Vote(models.Model):
    election = models.ForeignKey(Election, related_name="votes", on_delete=models.CASCADE)
    candidate = models.ForeignKey(Candidate, related_name="votes", on_delete=models.CASCADE)
    voter = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="votes", on_delete=models.PROTECT)
    cast_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-cast_at", "-id"]
        constraints = [
            models.UniqueConstraint(fields=["election", "voter"], name="one_vote_per_voter_per_election"),
        ]

    def clean(self):
        if self.candidate_id and self.election_id and self.candidate.election_id != self.election_id:
            raise ValidationError({"candidate": "Candidate does not belong to this election."})

    def __str__(self):
        return f"Vote #{self.pk} in {self.election.title}"
