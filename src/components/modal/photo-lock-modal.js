import React, { useEffect } from 'react';
import styles from '../photolock/styles/login.module.css'; // Import as a module

const Modal = ({ isOpen, onClose, children }) => {
  // UseEffect to control the body's overflow based on the modal's state
  useEffect(() => {
    // This will now correctly handle both opening and closing of the modal
    document.body.style.overflow = isOpen ? 'hidden' : 'auto';
    // Cleanup function to reset the overflow when the component unmounts
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Early return should be after the useEffect hook
  if (!isOpen) return null;

  return (
    <div className={styles.albumModalOverlay} onClick={onClose}>
      <div
        className={styles.albumModalBody}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.albumModalTitle}>PhotoLock Gallery</h2>
        {children}
      </div>
    </div>
  );
};

export default Modal;
