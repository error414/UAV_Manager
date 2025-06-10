import re
from rest_framework import status
from rest_framework.response import Response

class PaginationService:
    @staticmethod
    def handle_pagination(view, queryset, request):
        """
        Handles pagination with graceful out-of-range page handling.
        Returns appropriate response if page is out of range.
        
        Returns:
        - Response object if redirection is needed
        - None if standard pagination should continue
        """
        paginator = view.paginator
        page_size = paginator.get_page_size(request)
        
        if page_size <= 0:
            return None
            
        # Calculate total number of pages
        count = queryset.count()
        total_pages = (count + page_size - 1) // page_size if count > 0 else 1
        
        # Check if requested page is out of range
        page_param = paginator.page_query_param
        page_number = request.query_params.get(page_param, 1)
        
        try:
            page_number = int(page_number)
            if page_number > total_pages and count > 0:
                # Redirect to the last available page
                url = request.build_absolute_uri()
                
                # Replace or add the page parameter with the last page number
                if f"{page_param}=" in url:
                    url = re.sub(
                        f"{page_param}=\\d+", 
                        f"{page_param}={total_pages}", 
                        url
                    )
                else:
                    separator = "&" if "?" in url else "?"
                    url = f"{url}{separator}{page_param}={total_pages}"
                
                return Response(
                    {
                        "detail": f"Page {page_number} does not exist. Redirecting to page {total_pages}.",
                        "redirect_url": url,
                        "total_pages": total_pages,
                        "current_page": total_pages
                    },
                    status=status.HTTP_200_OK
                )
        except (ValueError, TypeError):
            pass  # Let the paginator handle invalid page numbers
        
        return None
    
    @staticmethod
    def paginate_queryset_safely(view, queryset, request):
        """
        Safely paginates a queryset, handling exceptions gracefully
        
        Returns:
        - Tuple of (page, None) if pagination is successful
        - Tuple of (None, Response) if there's an error or redirection needed
        """
        # Check for out-of-range pages
        redirect_response = PaginationService.handle_pagination(view, queryset, request)
        if redirect_response:
            return None, redirect_response
            
        # Standard pagination
        try:
            page = view.paginate_queryset(queryset)
            return page, None
        except Exception as e:
            # Handle pagination errors gracefully
            error_response = Response(
                {"detail": "Error retrieving page data. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )
            return None, error_response
    
    @staticmethod
    def paginate_with_enrichment(view, queryset, request, enrichment_func):
        """
        Paginate a queryset and apply an enrichment function to the results
        """
        page = view.paginate_queryset(queryset)
        
        if page is not None:
            serializer = view.get_serializer(page, many=True)
            response_data = serializer.data
            
            # Apply enrichment function if provided
            if enrichment_func:
                response_data = enrichment_func(response_data)
            
            return view.get_paginated_response(response_data)
        
        serializer = view.get_serializer(queryset, many=True)
        response_data = serializer.data
        
        # Apply enrichment function if provided
        if enrichment_func:
            response_data = enrichment_func(response_data)
        
        return Response(response_data)
