import { apiClient } from './client'
import type { ApiResponse, BackendArticle, BackendRecipe, BackendIngredient, BackendCollection } from './types'

export async function getArticlesApi(params?: { category?: string; page?: number; limit?: number }): Promise<ApiResponse<BackendArticle[]>> {
  return apiClient.get<ApiResponse<BackendArticle[]>>('/articles', { params, skipAuth: true })
}

export async function getArticleBySlugApi(slug: string): Promise<ApiResponse<BackendArticle>> {
  return apiClient.get<ApiResponse<BackendArticle>>(`/articles/${encodeURIComponent(slug)}`, { skipAuth: true })
}

export async function getRecipesApi(params?: { region?: string; cuisine?: string; difficulty?: string }): Promise<ApiResponse<BackendRecipe[]>> {
  return apiClient.get<ApiResponse<BackendRecipe[]>>('/recipes', { params, skipAuth: true })
}

export async function getRecipeBySlugApi(slug: string): Promise<ApiResponse<BackendRecipe>> {
  return apiClient.get<ApiResponse<BackendRecipe>>(`/recipes/${encodeURIComponent(slug)}`, { skipAuth: true })
}

export async function getIngredientsApi(params?: { q?: string }): Promise<ApiResponse<BackendIngredient[]>> {
  return apiClient.get<ApiResponse<BackendIngredient[]>>('/ingredients', { params, skipAuth: true })
}

export async function getIngredientBySlugApi(slug: string): Promise<ApiResponse<BackendIngredient>> {
  return apiClient.get<ApiResponse<BackendIngredient>>(`/ingredients/${encodeURIComponent(slug)}`, { skipAuth: true })
}

export async function getCollectionsApi(): Promise<ApiResponse<BackendCollection[]>> {
  return apiClient.get<ApiResponse<BackendCollection[]>>('/collections', { skipAuth: true })
}

export async function getCollectionBySlugApi(slug: string): Promise<ApiResponse<BackendCollection>> {
  return apiClient.get<ApiResponse<BackendCollection>>(`/collections/${encodeURIComponent(slug)}`, { skipAuth: true })
}
