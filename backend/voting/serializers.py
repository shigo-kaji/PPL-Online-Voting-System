from rest_framework import serializers

from .models import Candidate, CandidateGalleryImage, CandidateLink, Election


class CandidateGalleryImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CandidateGalleryImage
        fields = ("id", "image", "caption")


class CandidateLinkSerializer(serializers.ModelSerializer):
    platform_display = serializers.CharField(source="get_platform_display", read_only=True)

    class Meta:
        model = CandidateLink
        fields = ("id", "platform", "platform_display", "url", "label")


class CandidateSerializer(serializers.ModelSerializer):
    gallery = CandidateGalleryImageSerializer(many=True, read_only=True)
    links = CandidateLinkSerializer(many=True, read_only=True)

    class Meta:
        model = Candidate
        fields = ("id", "name", "statement", "photo", "summary", "bio", "gallery", "links")


class ElectionSerializer(serializers.ModelSerializer):
    candidates = CandidateSerializer(many=True, read_only=True)
    status = serializers.CharField(read_only=True)
    has_voted = serializers.SerializerMethodField()

    class Meta:
        model = Election
        fields = ("id", "title", "description", "starts_at", "ends_at", "status", "has_voted", "candidates")

    def get_has_voted(self, election):
        user = self.context["request"].user
        return user.is_authenticated and election.votes.filter(voter=user).exists()


class VoteInputSerializer(serializers.Serializer):
    candidate_id = serializers.IntegerField(min_value=1)
