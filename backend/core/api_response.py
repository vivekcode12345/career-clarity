from rest_framework import status
from rest_framework.response import Response


def success_response(data=None, message="", status_code=status.HTTP_200_OK):
    payload = {
        "success": True,
        "data": data if data is not None else {},
    }
    if message:
        payload["message"] = message
    return Response(payload, status=status_code)


def error_response(message="Request failed", data=None, status_code=status.HTTP_400_BAD_REQUEST):
    payload = {
        "success": False,
        "data": data if data is not None else {},
        "message": message,
    }
    return Response(payload, status=status_code)


def paginated_success_response(*, results, page, page_size, total_count, message=""):
    total_pages = (total_count + page_size - 1) // page_size if page_size > 0 else 1
    data = {
        "results": results,
        "page": page,
        "page_size": page_size,
        "total_pages": max(total_pages, 1),
        "total_count": total_count,
        "has_next": page < max(total_pages, 1),
        "has_previous": page > 1,
    }
    return success_response(data=data, message=message)
