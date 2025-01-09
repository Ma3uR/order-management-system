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
}

export type OrdersRecord<Tproducts = unknown> = {
	orderNumber: string
	source: string
	deliveryMethod: RecordIdString
	deliveryPostNumber?: string
	phoneNumber: string
	fullName: string
	products: Tproducts[]
	numberOfItems: number
	amount: number
	status: RecordIdString
	currency: RecordIdString
	paymentMethod: RecordIdString
	notes?: string
}

export type PaymentOptionsRecord = {
	name: string
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

export enum UsersRoleOptions {
	"user" = "user",
	"admin" = "admin",
}
export type UsersRecord = {
	name?: string
	role: UsersRoleOptions
}

// Response types include system fields and match responses from the PocketBase API
export type BlacklistEntriesResponse = BlacklistEntriesRecord & BaseSystemFields
export type ChatMessagesResponse<Texpand = unknown> = ChatMessagesRecord & BaseSystemFields<Texpand>
export type CurrencyResponse = CurrencyOptionsRecord & BaseSystemFields
export type DeliveryOptionsResponse = DeliveryOptionsRecord & BaseSystemFields
export type OrdersResponse<Tproducts = unknown, Texpand = unknown> = OrdersRecord<Tproducts> & BaseSystemFields<Texpand>
export type PaymentMethodsResponse = PaymentOptionsRecord & BaseSystemFields
export type SourcesResponse = SourcesRecord & BaseSystemFields
export type StatusResponse = StatusOptionsRecord & BaseSystemFields
export type UsersResponse = UsersRecord & AuthSystemFields

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
	users: UsersRecord
}

export type CollectionResponses = {
	blacklist_entries: BlacklistEntriesResponse
	chat_messages: ChatMessagesResponse
	currencies: CurrencyResponse
	delivery_options: DeliveryOptionsResponse
	orders: OrdersResponse
	payment_methods: PaymentMethodsResponse	
	sources: SourcesResponse
	status_options: StatusResponse
	users: UsersResponse
}