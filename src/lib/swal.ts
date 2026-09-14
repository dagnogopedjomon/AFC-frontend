import Swal from 'sweetalert2';

const defaults = {
  confirmButtonColor: '#315f9e',
  cancelButtonColor: '#64748b',
  buttonsStyling: true,
};

export async function confirmAction(title: string, text: string) {
  return Swal.fire({
    ...defaults,
    title,
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Confirmer',
    cancelButtonText: 'Annuler',
    reverseButtons: true,
  });
}

export function showSuccess(title: string, text?: string) {
  return Swal.fire({ ...defaults, title, text, icon: 'success', confirmButtonText: 'OK' });
}

export function showError(title: string, text?: string) {
  return Swal.fire({ ...defaults, title, text, icon: 'error', confirmButtonText: 'Fermer' });
}
