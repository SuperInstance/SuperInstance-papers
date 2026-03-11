export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: 'en' | 'es' | 'fr' | 'de'
  notifications: boolean
  analytics: boolean
  marketing: boolean
}

export interface NewsletterSignup {
  email: string
  name?: string
  source?: string
}

export interface GitHubRepo {
  name: string
  fullName: string
  description: string
  stars: number
  forks: number
  issues: number
  language: string
  license?: string
  updatedAt: string
  url: string
}

export interface SearchResult {
  id: string
  title: string
  description: string
  url: string
  score: number
  type: 'page' | 'document' | 'tutorial' | 'paper'
  tags?: string[]
}