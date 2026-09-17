import { apiClient } from './client'
import type { BackendProductReview } from './types'

export interface ProductReviewsResponse {
  reviews: BackendProductReview[]
  pagination: {
    total: number
    page: number
    pages: number
    limit: number
  }
  stats?: {
    averageRating: number
    totalReviews: number
    ratingDistribution: Array<{ rating: number; count: number; percentage: number }>
  }
}

export async function getProductReviewsApi(
  productId: string,
  page: number = 1,
  limit: number = 10
): Promise<ProductReviewsResponse> {
  return apiClient.get<ProductReviewsResponse>(`/reviews/product/${encodeURIComponent(productId)}`, {
    params: { page, limit },
    skipAuth: true,
  })
}

export async function createReviewApi(
  productId: string,
  rating: number,
  comment: string
): Promise<BackendProductReview> {
  return apiClient.post<BackendProductReview>('/reviews', {
    productId,
    rating,
    comment,
  })
}
