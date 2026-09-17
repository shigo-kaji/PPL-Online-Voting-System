# Requirements audit — Django backend

This audit separates what the backend already demonstrates from what the finished group project still needs. It was checked against the assignment supplied by the group.

## General project requirements

| # | Requirement | Backend status and evidence |
| --- | --- | --- |
| 1 | Working application or prototype | **Local MVP passes:** Django Admin and the REST API support account setup, elections, voting, and results. The Angular voter interface was exercised in a browser with local SQLite data. **Neon verification pending.** |
| 2 | Appropriate language | **Pass:** Python with Django and Django REST Framework. |
| 3 | At least five PPL concepts | **Pass:** eight concrete concepts are mapped below. |
| 4 | Explain language support | **Pass in draft:** the table below explains Python support and points to live code. |
| 5 | Input, processing, output | **Pass:** JSON credentials and candidate ID enter the API; validation and vote recording process them; JSON confirmation, errors, election data, and totals are output. |
| 6 | Structure and organization | **Pass:** models, serializers, services, views, URL routing, migrations, and tests have separate responsibilities. |
| 7 | Error and input handling | **Pass:** serializer validation, model validation, permission checks, malformed JSON handling, and database error handling. |
| 8 | Test before presentation | **Local checks pass:** 12 backend tests, 2 frontend utility tests, Angular production build, and a manual browser voting flow. **Pending:** Neon test and group demo rehearsal. |
| 9 | Complete project documentation | **In progress:** `PROJECT_DOCUMENTATION_DRAFT.md` has all 20 required sections. Group details, screenshots, final Neon setup, and member contributions remain to be filled. |
| 10 | Class presentation and demonstration | **Pending:** group presentation and live demonstration require all members. |

## PPL concepts implemented in Python

The group needs at least five. The first six rows alone satisfy that minimum; the other rows give additional examples.

| Concept | Python support | Actual implementation to show |
| --- | --- | --- |
| Variables and data types | Python binds names to values; Django model fields declare persistent data types. | `Election.starts_at` and `ends_at` are date/time fields, `is_published` is Boolean, and `VoteInputSerializer.candidate_id` is an integer. See `backend/voting/models.py` and `backend/voting/serializers.py`. |
| Expressions and operators, including Boolean logic | Python evaluates `and`, `not`, and comparisons to make decisions. | `Election.is_open_for_voting` combines published state with the time window; `cast_vote()` combines account conditions. See `backend/voting/models.py` and `backend/voting/services.py`. |
| Control structures | Python `if` statements select the correct path. | `cast_vote()` rejects an ineligible voter, closed election, foreign candidate, and duplicate vote before saving. |
| Functions and procedures | `def` creates reusable named operations with arguments and return values. | `cast_vote()`, `database_from_url()`, and the authentication views. |
| Data structures | Python lists and dictionaries organize related values. | The API builds a list of candidate-result dictionaries in `ElectionViewSet.results()`. |
| Exception handling | Python `try`/`except` handles expected failures without ending the request. | `login_view()` catches malformed JSON; `cast_vote()` catches `IntegrityError` from a concurrent duplicate ballot. |
| Modularity | Python modules separate responsibilities and can import each other. | `models.py`, `serializers.py`, `services.py`, `views.py`, `auth_views.py`, and `urls.py`. |
| Object-oriented programming and inheritance | Classes can hold data and behavior and inherit framework behavior. | `Election`, `Candidate`, and `Vote` inherit `models.Model`; `ElectionViewSet` inherits `ReadOnlyModelViewSet`. |

**Assigned focus:** Boolean logic appears in eligibility and election-window rules; input validation appears in serializers, model validation, and candidate checks; functions organize the vote process; exception handling covers malformed JSON and database conflicts.

## Test evidence

Run from `backend/`:

```powershell
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py test voting --verbosity 1
```

Latest result: **12 tests passed**, system check found **0 issues**, and migration check reported **No changes detected**. The tests cover successful voting, persistence, duplicate prevention in both API and database, input errors, candidate membership, election timing, results timing and counts, unpublished elections, account permissions, invalid dates, malformed JSON, and CSRF-protected session login.

## Remaining gates for the full project

1. Set a real Neon `DATABASE_URL`, install the PostgreSQL driver, run migrations, and verify a read/write cycle against Neon. The current tests use Django's isolated SQLite test database because Neon credentials have not been configured here.
2. Capture system screenshots for the report and automate the browser end-to-end test if the presentation rubric requires it. A manual browser flow has been verified locally.
3. Review the final visual design against the Power Apps cards mockup when a screenshot or export is available from the work laptop.
4. Add group names, each member's contribution, presentation roles, and final references to the documentation.
5. Rehearse the live demonstration with every member participating.
