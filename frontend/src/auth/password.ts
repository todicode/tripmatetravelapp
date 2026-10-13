export function passwordError(password: string): string | null {
  if (!password.trim() || password.length < 8 || password.length > 128) {
    return 'Mật khẩu cần từ 8 đến 128 ký tự.';
  }
  try {
    if (encodeURIComponent(password).replace(/%[A-F\d]{2}/gi, '_').length > 72) {
      return 'Mật khẩu vượt quá 72 byte UTF-8. Hãy dùng mật khẩu ngắn hơn.';
    }
  } catch {
    return 'Mật khẩu chứa ký tự không hợp lệ.';
  }
  return null;
}
