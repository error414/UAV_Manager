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
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40"
    >
      <div className="min-w-[320px] max-w-[400px] rounded-lg p-6 shadow-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <h2 className="mt-0 text-xl font-semibold">{title}</h2>
        <div className="my-4 whitespace-pre-line">{message}</div>
        <div className="flex justify-end gap-2">
          {cancelText && (
            <button
              onClick={onCancel}
              className="rounded px-4 py-2 cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-100"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="rounded px-4 py-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
