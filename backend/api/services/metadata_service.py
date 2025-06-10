class MetadataService:
    @staticmethod
    def get_model_id_range(model_class, user=None, filter_kwargs=None):
        """Get the min and max ID values for a model, optionally filtered"""
        if filter_kwargs is None:
            filter_kwargs = {}
        
        if user is not None:
            filter_kwargs['user'] = user
            
        queryset = model_class.objects.filter(**filter_kwargs)
        min_id_field = queryset.model._meta.pk.name
        
        min_id = queryset.order_by(min_id_field).values_list(min_id_field, flat=True).first()
        max_id = queryset.order_by(f'-{min_id_field}').values_list(min_id_field, flat=True).first()
        
        return {'minId': min_id, 'maxId': max_id}
