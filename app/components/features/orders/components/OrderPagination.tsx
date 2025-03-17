import { Button } from "@/app/components/shared/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
    page?: string;
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
  // Function to generate a reasonable range of page numbers
  const getPageRange = () => {
    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    } else {
      // Show a window around the current page
      let start = Math.max(currentPage - 2, 1);
      let end = Math.min(start + 4, totalPages);
      
      // Adjust if we're near the end
      if (end === totalPages) {
        start = Math.max(end - 4, 1);
      }
      
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    }
  };
  
  const pageRange = getPageRange();
  
  return (
    <div className="flex flex-col md:flex-row items-center justify-between border-t border-border px-2 py-3 md:px-6 mt-4 gap-3">
      <div className="w-full md:w-auto">
        <p className="text-xs md:text-sm text-center md:text-left text-muted-foreground">
          {translations.showing} <span className="font-medium">{startIndex + 1}</span>-
          <span className="font-medium">{Math.min(endIndex, totalItems)}</span> {translations.of}{" "}
          <span className="font-medium">{totalItems}</span> {translations.results}
        </p>
      </div>
      
      <div className="flex items-center justify-center">
        <nav className="flex items-center space-x-1" aria-label="Pagination">
          {/* Previous Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">{translations.previous}</span>
          </Button>
          
          {/* First Page (if not in range) */}
          {pageRange[0] > 1 && (
            <>
              <Button
                variant={currentPage === 1 ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 md:h-9 md:w-9 p-0 hidden sm:inline-flex"
                onClick={() => onPageChange(1)}
              >
                1
              </Button>
              
              {pageRange[0] > 2 && (
                <span className="px-2 text-muted-foreground hidden sm:inline-flex">...</span>
              )}
            </>
          )}
          
          {/* Page Numbers */}
          {pageRange.map((page) => (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 md:h-9 md:w-9 p-0"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          ))}
          
          {/* Last Page (if not in range) */}
          {pageRange[pageRange.length - 1] < totalPages && (
            <>
              {pageRange[pageRange.length - 1] < totalPages - 1 && (
                <span className="px-2 text-muted-foreground hidden sm:inline-flex">...</span>
              )}
              
              <Button
                variant={currentPage === totalPages ? "default" : "ghost"}
                size="sm"
                className="h-8 w-8 md:h-9 md:w-9 p-0 hidden sm:inline-flex"
                onClick={() => onPageChange(totalPages)}
              >
                {totalPages}
              </Button>
            </>
          )}
          
          {/* Next Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:h-9 md:w-9"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">{translations.next}</span>
          </Button>
        </nav>
      </div>
      
      <div className="text-xs text-muted-foreground text-center md:hidden">
        {translations.page || 'Page'} {currentPage} {translations.of} {totalPages}
      </div>
    </div>
  );
} 