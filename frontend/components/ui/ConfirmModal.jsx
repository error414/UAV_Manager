const ConfirmModal = ({
  open,
  title = "Confirmation",
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel"
}) => {
  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 8,
        minWidth: 320,
        maxWidth: 400,
        padding: 24,
        boxShadow: '0 2px 16px rgba(0,0,0,0.2)'
      }}>
        <h2 style={{marginTop: 0}}>{title}</h2>
        <div style={{margin: '16px 0', whiteSpace: 'pre-line'}}>{message}</div>
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: 8}}>
          {cancelText && (
            <button
              onClick={onCancel}
              style={{
                background: '#eee',
                border: 'none',
                borderRadius: 4,
                padding: '8px 16px',
                cursor: 'pointer'
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
