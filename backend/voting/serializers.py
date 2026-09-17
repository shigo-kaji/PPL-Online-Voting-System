from rest_framework import serializers

from .models import Candidate, Election


class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = ("id", "name", "statement")


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
