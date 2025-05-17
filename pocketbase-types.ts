/**
* This file was @generated using pocketbase-typegen
*/

export enum Collections {
	BlacklistEntries = "blacklist_entries",
	Chats = "chats",
	CurrencyOptions = "currency_options",
	DeliveryOptions = "delivery_options",
	Expenses = "expenses",
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

export type ChatsRecord<Tmessages = unknown> = {
	messages?: null | Tmessages
	user?: RecordIdString
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
	promId?: number
	isDefault?: boolean
}

export type ExpensesRecord = {
	amount?: number
	description?: string
	date?: IsoDateString
}

export enum OrdersMergeStatusOptions {
	"none" = "none",
	"pending" = "pending",
	"merged" = "merged",
	"rejected" = "rejected",
}

export enum OrdersMergeSourceOptions {
	"none" = "none",
	"phone" = "phone",
	"name" = "name",
}
export type OrdersRecord<ToriginalOrders = unknown, Tproducts = unknown> = {
	orderNumber: string
	marketplaceIds?: string
	source?: RecordIdString
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
	mergeStatus: OrdersMergeStatusOptions
	mergedWithOrderId?: string
	originalOrders?: null | ToriginalOrders
	mergeSource: OrdersMergeSourceOptions
	archived?: boolean
	productionCost?: number
}

export type PaymentOptionsRecord = {
	name: string
	rozetkaId?: number
	isDefault?: boolean
	promId?: number
}

export type SourcesRecord = {
	name?: string
	url?: string
}

export type StatusOptionsRecord = {
	name: string
	color: string
	priority: number
	epicentrCode?: string
	rozetkaCode?: string
	promuaCode?: string
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
export type ChatsResponse<Tmessages = unknown, Texpand = unknown> = Required<ChatsRecord<Tmessages>> & BaseSystemFields<Texpand>
export type CurrencyOptionsResponse = Required<CurrencyOptionsRecord> & BaseSystemFields
export type DeliveryOptionsResponse = Required<DeliveryOptionsRecord> & BaseSystemFields
export type ExpensesResponse = Required<ExpensesRecord> & BaseSystemFields
export type OrdersResponse<ToriginalOrders = unknown, Tproducts = unknown, Texpand = unknown> = Required<OrdersRecord<ToriginalOrders, Tproducts>> & BaseSystemFields<Texpand>
export type PaymentOptionsResponse = Required<PaymentOptionsRecord> & BaseSystemFields
export type SourcesResponse = Required<SourcesRecord> & BaseSystemFields
export type StatusOptionsResponse = Required<StatusOptionsRecord> & BaseSystemFields
export type SyncRecordsResponse = Required<SyncRecordsRecord> & BaseSystemFields
export type UsersResponse = Required<UsersRecord> & AuthSystemFields

// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	blacklist_entries: BlacklistEntriesRecord
	chats: ChatsRecord
	currency_options: CurrencyOptionsRecord
	delivery_options: DeliveryOptionsRecord
	expenses: ExpensesRecord
	orders: OrdersRecord
	payment_options: PaymentOptionsRecord
	sources: SourcesRecord
	status_options: StatusOptionsRecord
	sync_records: SyncRecordsRecord
	users: UsersRecord
}

export type CollectionResponses = {
	blacklist_entries: BlacklistEntriesResponse
	chats: ChatsResponse
	currency_options: CurrencyOptionsResponse
	delivery_options: DeliveryOptionsResponse
	expenses: ExpensesResponse
	orders: OrdersResponse
	payment_options: PaymentOptionsResponse
	sources: SourcesResponse
	status_options: StatusOptionsResponse
	sync_records: SyncRecordsResponse
	users: UsersResponse
}