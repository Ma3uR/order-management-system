import { Button } from "@/app/components/ui/button";

interface OrderPaginationProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  translations: {
    showing: string;
    of: string;
    results: string;
    previous: string;
    next: string;
  };
}

export function OrderPagination({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  totalItems,
  onPageChange,
  translations
}: OrderPaginationProps) {
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-6 mt-4">
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1}
          variant="ghost"
          size="sm"
        >
          {translations.previous}
        </Button>
        <Button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages}
          variant="ghost"
          size="sm"
        >
          {translations.next}
        </Button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {translations.showing} <span className="font-medium">{startIndex + 1}</span> {translations.of}{" "}
            <span className="font-medium">{Math.min(endIndex, totalItems)}</span> {translations.of}{" "}
            <span className="font-medium">{totalItems}</span> {translations.results}
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-md"
              onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
              disabled={currentPage === 1}
            >
              {translations.previous}
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "ghost"}
                size="sm"
                className="rounded-none"
                onClick={() => onPageChange(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-md"
              onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              {translations.next}
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
} 