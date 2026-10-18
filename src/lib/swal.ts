import Swal from 'sweetalert2';

// Boutons des fenêtres SweetAlert aux couleurs de la charte (bleu AFC, texte secondaire).
const defaults = {
  confirmButtonColor: '#2F68B1',
  cancelButtonColor: '#6A727C',
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
