import Swal from 'sweetalert2';

// Custom SweetAlert2 configuration with Catppuccin Mocha theme
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  background: '#313244',
  color: '#cdd6f4',
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

// Catppuccin Mocha themed SweetAlert2
const customSwal = Swal.mixin({
  background: '#313244',
  color: '#cdd6f4',
  confirmButtonColor: '#89b4fa',
  cancelButtonColor: '#f38ba8',
  customClass: {
    popup: 'swal-catppuccin-popup',
    title: 'swal-catppuccin-title',
    htmlContainer: 'swal-catppuccin-text',
    confirmButton: 'swal-catppuccin-confirm',
    cancelButton: 'swal-catppuccin-cancel',
    input: 'swal-catppuccin-input'
  }
});

// Success alert
export const showSuccess = (title, text = '') => {
  return Toast.fire({
    icon: 'success',
    title,
    text,
    iconColor: '#a6e3a1'
  });
};

// Error alert
export const showError = (title, text = '') => {
  return Toast.fire({
    icon: 'error',
    title,
    text,
    iconColor: '#f38ba8'
  });
};

// Warning alert
export const showWarning = (title, text = '') => {
  return Toast.fire({
    icon: 'warning',
    title,
    text,
    iconColor: '#f9e2af'
  });
};

// Info alert
export const showInfo = (title, text = '') => {
  return Toast.fire({
    icon: 'info',
    title,
    text,
    iconColor: '#89b4fa'
  });
};

// Confirmation dialog
export const showConfirm = (title, text, confirmButtonText = 'Yes', cancelButtonText = 'No') => {
  return customSwal.fire({
    title,
    text,
    icon: 'question',
    iconColor: '#f9e2af',
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText,
    reverseButtons: true
  });
};

// Delete confirmation
export const showDeleteConfirm = (itemName = 'this item') => {
  return customSwal.fire({
    title: 'Are you sure?',
    text: `You won't be able to recover ${itemName}!`,
    icon: 'warning',
    iconColor: '#f38ba8',
    showCancelButton: true,
    confirmButtonText: 'Yes, delete it!',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  });
};

// Loading alert
export const showLoading = (title = 'Loading...', text = 'Please wait') => {
  return customSwal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
};

// Close loading
export const closeLoading = () => {
  Swal.close();
};

// Custom styled alert (for special cases)
export const showCustomAlert = (options) => {
  return customSwal.fire(options);
};

export default {
  showSuccess,
  showError,
  showWarning,
  showInfo,
  showConfirm,
  showDeleteConfirm,
  showLoading,
  closeLoading,
  showCustomAlert,
  Toast,
  Swal: customSwal
};
