from django.contrib import admin

from .models import Candidate, Election, Vote


class CandidateInline(admin.TabularInline):
    model = Candidate
    extra = 2


@admin.register(Election)
class ElectionAdmin(admin.ModelAdmin):
    list_display = ("title", "starts_at", "ends_at", "is_published")
    list_filter = ("is_published",)
    inlines = (CandidateInline,)


@admin.register(Candidate)
class CandidateAdmin(admin.ModelAdmin):
    list_display = ("name", "election", "has_photo")
    list_filter = ("election",)
    search_fields = ("name",)

    @admin.display(boolean=True, description="Photo")
    def has_photo(self, candidate):
        return bool(candidate.photo)


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ("id", "election", "voter", "candidate", "cast_at")
    list_filter = ("election",)
    readonly_fields = ("election", "voter", "candidate", "cast_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        # Superusers need this to remove elections or candidates that already have votes.
        return request.user.is_superuser
