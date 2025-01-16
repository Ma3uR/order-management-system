/**
* This file was @generated using pocketbase-typegen
*/

export enum Collections {
	BlacklistEntries = "blacklist_entries",
	ChatMessages = "chat_messages",
	CurrencyOptions = "currency_options",
	DeliveryOptions = "delivery_options",
	Orders = "orders",
	PaymentOptions = "payment_options",
	Sources = "sources",
	StatusOptions = "status_options",
	SyncRecords = "sync_records",
	Users = "users",
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

export type BlacklistEntriesRecord = {
	fullName?: string
	city?: string
	totalOrderSum?: number
	notes?: string
	phoneNumber?: string
}

export type ChatMessagesRecord = {
	user: RecordIdString
	role: string
	content: string
	conversation_id: string
}

export type CurrencyOptionsRecord = {
	code: string
	name: string
	symbol: string
	isDefault: boolean
}

export type DeliveryOptionsRecord = {
	name: string
	rozetkaId?: number
}

export type OrdersRecord<Tproducts = unknown> = {
	orderNumber: string
	source: string
	deliveryMethod: RecordIdString
	deliveryPostNumber?: string
	phoneNumber: string
	fullName: string
	products: null | Tproducts
	numberOfItems: number
	amount: number
	status: RecordIdString
	currency: RecordIdString
	paymentMethod: RecordIdString
	notes?: string
}

export type PaymentOptionsRecord = {
	name: string
	rozetkaId?: number
}

export type SourcesRecord = {
	name?: string
	url?: string
}

export type StatusOptionsRecord = {
	name: string
	color: string
	priority: number
}

export type SyncRecordsRecord = {
	source?: string
	orders_processed?: number
	orders_failures?: number
}

export enum UsersRoleOptions {
	"user" = "user",
	"admin" = "admin",
}
export type UsersRecord = {
	name?: string
	role: UsersRoleOptions
}

// Response types include system fields and match responses from the PocketBase API
export type BlacklistEntriesResponse = Required<BlacklistEntriesRecord> & BaseSystemFields
export type ChatMessagesResponse<Texpand = unknown> = Required<ChatMessagesRecord> & BaseSystemFields<Texpand>
export type CurrencyOptionsResponse = Required<CurrencyOptionsRecord> & BaseSystemFields
export type DeliveryOptionsResponse = Required<DeliveryOptionsRecord> & BaseSystemFields
export type OrdersResponse<Tproducts = unknown, Texpand = unknown> = Required<OrdersRecord<Tproducts>> & BaseSystemFields<Texpand>
export type PaymentOptionsResponse = Required<PaymentOptionsRecord> & BaseSystemFields
export type SourcesResponse = Required<SourcesRecord> & BaseSystemFields
export type StatusOptionsResponse = Required<StatusOptionsRecord> & BaseSystemFields
export type SyncRecordsResponse = Required<SyncRecordsRecord> & BaseSystemFields
export type UsersResponse = Required<UsersRecord> & AuthSystemFields

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	blacklist_entries: BlacklistEntriesRecord
	chat_messages: ChatMessagesRecord
	currency_options: CurrencyOptionsRecord
	delivery_options: DeliveryOptionsRecord
	orders: OrdersRecord
	payment_options: PaymentOptionsRecord
	sources: SourcesRecord
	status_options: StatusOptionsRecord
	sync_records: SyncRecordsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	blacklist_entries: BlacklistEntriesResponse
	chat_messages: ChatMessagesResponse
	currency_options: CurrencyOptionsResponse
	delivery_options: DeliveryOptionsResponse
	orders: OrdersResponse
	payment_options: PaymentOptionsResponse
	sources: SourcesResponse
	status_options: StatusOptionsResponse
	sync_records: SyncRecordsResponse
	users: UsersResponse
}