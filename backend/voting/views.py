from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Election, Vote
from .serializers import ElectionSerializer, VoteInputSerializer
from .services import cast_vote


class ElectionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Election.objects.filter(is_published=True).prefetch_related("candidates__gallery", "candidates__links")
    serializer_class = ElectionSerializer

    @action(detail=True, methods=["post"])
    def vote(self, request, pk=None):
        election = self.get_object()
        data = VoteInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        vote = cast_vote(voter=request.user, election=election, candidate_id=data.validated_data["candidate_id"])
        return Response({
            "detail": "Vote recorded.",
            "election_id": election.id,
            "candidate_id": vote.candidate_id,
            "cast_at": vote.cast_at,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def results(self, request, pk=None):
        election = self.get_object()
        if election.status != "closed":
            raise PermissionDenied("Results are available after the election closes.")
        candidates = election.candidates.annotate(vote_count=Count("votes"))
        return Response({
            "election_id": election.id,
            "total_votes": Vote.objects.filter(election=election).count(),
            "candidates": [
                {"candidate_id": candidate.id, "name": candidate.name, "votes": candidate.vote_count}
                for candidate in candidates
            ],
        })
