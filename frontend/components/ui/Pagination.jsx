export const getVisiblePageNumbers = (currentPage, totalPages, siblingsCount = 1) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [1];
  
  const startSibling = Math.max(2, currentPage - siblingsCount);
  const endSibling = Math.min(totalPages - 1, currentPage + siblingsCount);
  
  if (startSibling > 2) pages.push(null);
  
  for (let i = startSibling; i <= endSibling; i++) {
    pages.push(i);
  }
  
  if (endSibling < totalPages - 1) pages.push(null);
  
  if (totalPages > 1) pages.push(totalPages);
  
  return pages;
};

const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  siblingsCount = 1,
  className = "flex justify-center items-center mt-4 gap-2",
  buttonClassName = "px-3 py-1 bg-gray-200 rounded disabled:opacity-50",
  activeClassName = "bg-blue-500 text-white",
  inactiveClassName = "bg-gray-200",
  pageButtonClassName = "w-8 h-8 flex items-center justify-center rounded"
}) => {
  if (totalPages <= 1) return null;
  
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages, siblingsCount);
  
  const NavButton = ({ direction, disabled, onClick }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={buttonClassName}
    >
      {direction === 'prev' ? '« Prev' : 'Next »'}
    </button>
  );
  
  return (
    <div className={className}>
      <NavButton 
        direction="prev"
        disabled={currentPage === 1} 
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      />
      
      <div className="flex items-center gap-1">
        {visiblePages.map((page, index) => 
          page === null ? (
            <span key={`ellipsis-${index}`} className="px-1">...</span>
          ) : (
            <button
              key={`page-${page}`}
              onClick={() => onPageChange(page)}
              className={`${pageButtonClassName} ${
                currentPage === page ? activeClassName : inactiveClassName
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>
      
      <NavButton 
        direction="next"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
      />
    </div>
  );
};

export default Pagination;
