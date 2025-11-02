/**
 * Database type definitions
 * 
 * Types representing database entities and their relationships
 */

import type { UUID, DatabaseTimestamp, Nullable } from './index'

// Base entity interface
export interface BaseEntity {
  id: UUID
  organization_id: UUID
  created_at: DatabaseTimestamp
  updated_at: DatabaseTimestamp
}

// User entity
export interface User extends BaseEntity {
  auth_id: UUID
  email: string
  first_name: Nullable<string>
  last_name: Nullable<string>
  avatar_url: Nullable<string>
  role: Nullable<string>
  is_active: boolean
}

// Organization entity
export interface Organization extends BaseEntity {
  name: string
  slug: Nullable<string>
  domain: Nullable<string>
  subscription_tier: Nullable<string>
}

// Product-related entities
export interface ProductType {
  id: UUID
  name: string
  code: string
  description: Nullable<string>
  icon: Nullable<string>
  is_active: boolean
}

export interface Product extends BaseEntity {
  name: string
  code: string
  product_type_id: UUID
  description: Nullable<string>
  venue_name: Nullable<string>
  is_active: boolean
  attributes: Nullable<Record<string, unknown>>
  media_urls: Nullable<string[]>
}

// Supplier entity
export interface Supplier extends BaseEntity {
  name: string
  code: string
  supplier_type: Nullable<string>
  email: Nullable<string>
  phone: Nullable<string>
  country: Nullable<string>
  is_active: boolean
}

// Event entity
export interface Event extends BaseEntity {
  event_name: string
  event_code: Nullable<string>
  event_type: Nullable<string>
  venue_name: Nullable<string>
  city: Nullable<string>
  country: Nullable<string>
  event_date_from: DatabaseTimestamp
  event_date_to: DatabaseTimestamp
  event_status: Nullable<string>
  description: Nullable<string>
  event_image_url: Nullable<string>
}

// Contract entity
export interface Contract extends BaseEntity {
  contract_number: string
  contract_name: Nullable<string>
  contract_type: Nullable<string>
  supplier_id: Nullable<UUID>
  event_id: Nullable<UUID>
  valid_from: DatabaseTimestamp
  valid_to: DatabaseTimestamp
  currency: Nullable<string>
  total_cost: Nullable<number>
  commission_rate: Nullable<number>
  status: Nullable<string>
  payment_terms: Nullable<string>
  cancellation_policy: Nullable<string>
  terms_and_conditions: Nullable<string>
  contract_files: Nullable<unknown>
  notes: Nullable<string>
  owner_id: Nullable<UUID>
}

