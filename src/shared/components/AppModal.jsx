function AppModal({ isOpen, title, onClose, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="ims-modal-backdrop" onClick={onClose} />

      <div className="ims-modal-shell">
        <div className="ims-modal-card">
          <div className="ims-modal-header">
            <h5 className="ims-modal-title">{title}</h5>

            <button
              type="button"
              className="btn btn-outline-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>

          <div className="ims-modal-body">{children}</div>
        </div>
      </div>
    </>
  );
}

export default AppModal;