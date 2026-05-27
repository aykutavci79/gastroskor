# MVP Architecture Notes

## Domain Flow

1. User signs in with Google.
2. User searches/selects a restaurant.
3. System stores restaurant and platform profile (Google Place ID, URL, rating snapshots).
4. User submits an in-app review.
5. AI service analyzes review into categories (lezzet/servis/fiyat/hijyen).
6. UI shows sentiment summary for users and restaurant managers.
7. "Publish on Google" action redirects user to Google deep link.

## Core Tables

- `users`
- `restaurants`
- `restaurant_platform_profiles`
- `reviews`
- `review_category_scores`

## API Design (v1)

- `GET /api/v1/health`
- `GET /api/v1/restaurants`
- `POST /api/v1/restaurants`
- `GET /api/v1/restaurants/{id}`
- `POST /api/v1/reviews`
- `GET /api/v1/restaurants/{id}/reviews`
- `POST /api/v1/reviews/{id}/analyze`

## Next Steps

1. Alembic migration setup and first revision.
2. Google OAuth login flow.
3. Restaurant CRUD endpoints.
4. Review create + AI analyze endpoint.
5. Dashboard UI (aggregate platform scores + sentiment charts).

