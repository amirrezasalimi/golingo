/**
* This file was @generated using pocketbase-typegen
*/

import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'

export enum Collections {
	Users = "users",
	WebsitePages = "website_pages",
	Websites = "websites",
}

// Alias types for improved usability
export type IsoDateString = string
export type RecordIdString = string
export type HTMLString = string

// System fields
export type BaseSystemFields<T = never> = {
	id: RecordIdString
	created: IsoDateString
	updated: IsoDateString
	collectionId: string
	collectionName: Collections
	expand?: T
}

export type AuthSystemFields<T = never> = {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
} & BaseSystemFields<T>

// Record types for each collection

export type UsersRecord = {
	avatar?: string
	name?: string
	receivedFreeWordsCredit?: boolean
	wordsCredit?: number
}

export type WebsitePagesRecord<Ttranslates = unknown> = {
	path?: string
	translates?: null | Ttranslates
	website?: RecordIdString
}

export type WebsitesRecord<Tcached_translates = unknown, Tlanguages = unknown> = {
	cached_translates?: null | Tcached_translates
	languages?: null | Tlanguages
	primary_lang?: string
	unique_code?: string
	url?: string
	user?: RecordIdString
	verified?: boolean
}

// Response types include system fields and match responses from the PocketBase API
export type UsersResponse<Texpand = unknown> = Required<UsersRecord> & AuthSystemFields<Texpand>
export type WebsitePagesResponse<Ttranslates = unknown, Texpand = unknown> = Required<WebsitePagesRecord<Ttranslates>> & BaseSystemFields<Texpand>
export type WebsitesResponse<Tcached_translates = unknown, Tlanguages = unknown, Texpand = unknown> = Required<WebsitesRecord<Tcached_translates, Tlanguages>> & BaseSystemFields<Texpand>

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	users: UsersRecord
	website_pages: WebsitePagesRecord
	websites: WebsitesRecord
}

export type CollectionResponses = {
	users: UsersResponse
	website_pages: WebsitePagesResponse
	websites: WebsitesResponse
}

// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions

export type TypedPocketBase = PocketBase & {
	collection(idOrName: 'users'): RecordService<UsersResponse>
	collection(idOrName: 'website_pages'): RecordService<WebsitePagesResponse>
	collection(idOrName: 'websites'): RecordService<WebsitesResponse>
}
