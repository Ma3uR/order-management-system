/**
* This file was @generated using pocketbase-typegen
*/

export enum Collections {
	BlacklistEntries = "blacklist_entries",
	Chats = "chats",
	CurrencyOptions = "currency_options",
	DeliveryOptions = "delivery_options",
	Expenses = "expenses",
	ExpensesCategories = "expenses_categories",
	FiscalReceipts = "fiscal_receipts",
	FiscalShifts = "fiscal_shifts",
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
	category?: RecordIdString
}

export type ExpensesCategoriesRecord = {
	name: string
	color?: string
}

export enum FiscalReceiptsReceiptTypeOptions {
	"sale" = "sale",
	"return" = "return",
	"z_report" = "z_report",
}

export enum FiscalReceiptsStatusOptions {
	"pending" = "pending",
	"success" = "success",
	"failed" = "failed",
}

export type FiscalReceiptsRecord<Tcasa_response = unknown, Tfiscal_data = unknown> = {
	order_id?: RecordIdString
	receipt_type?: FiscalReceiptsReceiptTypeOptions
	fiscal_data?: null | Tfiscal_data
	casa_response?: null | Tcasa_response
	qr_code?: string
	document_code?: string
	shift_id?: RecordIdString
	status?: FiscalReceiptsStatusOptions
	error_message?: string
}

export enum FiscalShiftsStatusOptions {
	"open" = "open",
	"closed" = "closed",
}

export type FiscalShiftsRecord<Tz_report_data = unknown> = {
	cashier: string
	opened_at: IsoDateString
	closed_at?: IsoDateString
	status?: FiscalShiftsStatusOptions
	z_report_data?: null | Tz_report_data
	total_sales?: number
	total_returns?: number
	receipts_count?: number
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
export type OrdersRecord<Tinvoice_data = unknown, ToriginalOrders = unknown, Tproducts = unknown> = {
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
	invoice_data?: null | Tinvoice_data
	created_at_marketplace?: IsoDateString
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
	color?: string
}

export type StatusOptionsRecord = {
	name: string
	color: string
	priority: number
	source?: RecordIdString
	marketplace_code?: string
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
export type CurrencyResponse = CurrencyOptionsRecord & BaseSystemFields
export type DeliveryOptionsResponse = DeliveryOptionsRecord & BaseSystemFields
export type OrdersResponse<Tproducts = unknown, Texpand = unknown> = OrdersRecord<Tproducts> & BaseSystemFields<Texpand>
export type PaymentMethodsResponse = PaymentOptionsRecord & BaseSystemFields
export type SourcesResponse = SourcesRecord & BaseSystemFields
export type StatusResponse = StatusOptionsRecord & BaseSystemFields
export type UsersResponse = UsersRecord & AuthSystemFields
export type SyncRecordsResponse = SyncRecordsRecord & BaseSystemFields
export type ExpensesResponse = ExpensesRecord & BaseSystemFields
export type ExpensesCategoriesResponse = ExpensesCategoriesRecord & BaseSystemFields
export type FiscalReceiptsResponse<Tcasa_response = unknown, Tfiscal_data = unknown, Texpand = unknown> = Required<FiscalReceiptsRecord<Tcasa_response, Tfiscal_data>> & BaseSystemFields<Texpand>
export type FiscalShiftsResponse<Tz_report_data = unknown, Texpand = unknown> = Required<FiscalShiftsRecord<Tz_report_data>> & BaseSystemFields<Texpand>
// Types containing all Records and Responses, useful for creating typing helper functions

export type CollectionRecords = {
	blacklist_entries: BlacklistEntriesRecord
	chats: ChatsRecord
	currency_options: CurrencyOptionsRecord
	delivery_options: DeliveryOptionsRecord
	expenses: ExpensesRecord
	expenses_categories: ExpensesCategoriesRecord
	fiscal_receipts: FiscalReceiptsRecord
	fiscal_shifts: FiscalShiftsRecord
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
	currency_options: CurrencyResponse
	delivery_options: DeliveryOptionsResponse
	expenses: ExpensesResponse
	expenses_categories: ExpensesCategoriesResponse
	fiscal_receipts: FiscalReceiptsResponse
	fiscal_shifts: FiscalShiftsResponse
	orders: OrdersResponse
	payment_options: PaymentMethodsResponse
	sources: SourcesResponse
	status_options: StatusResponse
	sync_records: SyncRecordsResponse
	users: UsersResponse
}