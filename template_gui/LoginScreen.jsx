import React, { useState } from 'react';
import { useNav } from '../context/NavContext';
import { 
  Lock, 
  Mail, 
  KeyRound, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  X,
  User,
  Phone
} from 'lucide-react';

export default function LoginScreen({ params = {} }) {
  const { switchTab, showToast } = useNav();
  const [activeTab, setActiveTab] = useState(params.tab || params.initialTab || 'login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('nguyenvana@gmail.com');
  const [loginPassword, setLoginPassword] = useState('TripMate2026!');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('Nguyễn Văn A');
  const [regEmail, setRegEmail] = useState('nguyenvana@gmail.com');
  const [regPhone, setRegPhone] = useState('0912345678');
  const [regPassword, setRegPassword] = useState('TripMate2026@');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Forgot password state (Không được xoá theo yêu cầu người dùng)
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Pass, 4: Success
  const [forgotEmail, setForgotEmail] = useState('nguyenvana@gmail.com');
  const [demoOtp, setDemoOtp] = useState('864219');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword.trim()) {
      showToast('Lỗi', 'Vui lòng nhập đầy đủ email và mật khẩu');
      return;
    }
    showToast('Đăng nhập thành công', 'Chào mừng bạn quay lại TripMate!');
    switchTab('explore');
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPhone.trim() || !regPassword.trim()) {
      showToast('Lỗi', 'Vui lòng điền đầy đủ thông tin đăng ký');
      return;
    }
    if (!agreeTerms) {
      showToast('Thông báo', 'Vui lòng đồng ý với điều khoản sử dụng');
      return;
    }
    showToast('Thành công', 'Đăng ký tài khoản thành công!');
    switchTab('explore');
  };

  const triggerSocialAuth = (provider) => {
    showToast(provider, `Đã xác thực tài khoản ${provider} thành công!`);
    setTimeout(() => {
      switchTab('explore');
    }, 600);
  };

  // Open / Close Forgot Password Modal
  const openForgotModal = () => {
    setForgotStep(1);
    setEnteredOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setIsForgotModalOpen(true);
  };

  const closeForgotModal = () => {
    setIsForgotModalOpen(false);
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      showToast('Lỗi', 'Vui lòng nhập email đăng ký');
      return;
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoOtp(generatedOtp);
    setEnteredOtp('');
    setForgotStep(2);
    showToast('Đã gửi mã xác thực', `Mã OTP demo của bạn là ${generatedOtp}`);
  };

  // Step 2: Resend OTP
  const handleResendOtp = () => {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setDemoOtp(generatedOtp);
    showToast('Đã gửi lại mã', `Mã OTP mới là ${generatedOtp}`);
  };

  // Quick fill demo OTP
  const handleQuickFillOtp = () => {
    setEnteredOtp(demoOtp);
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = (e) => {
    e.preventDefault();
    if (enteredOtp.trim() !== demoOtp) {
      showToast('Lỗi', 'Mã OTP không chính xác. Vui lòng kiểm tra lại!');
      return;
    }
    showToast('Xác thực thành công', 'Vui lòng nhập mật khẩu mới');
    setForgotStep(3);
  };

  // Step 3: Reset Password
  const handleResetPassword = (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Lỗi', 'Mật khẩu phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }
    setForgotStep(4);
  };

  // Step 4: Finish and apply new password to login form
  const handleFinishReset = () => {
    setLoginPassword(newPassword);
    closeForgotModal();
    setActiveTab('login');
    showToast('Đổi mật khẩu thành công', 'Mật khẩu mới đã được tự động điền!');
  };

  return (
    <div className="h-full flex flex-col justify-between bg-[#f5f5f7] overflow-y-auto no-scrollbar relative select-none">
      
      {/* ==================== 1. PHOTOGRAPHY HERO SECTION ==================== */}
      <section className="relative z-20 px-5 pt-4 pb-1 flex flex-col items-center text-center shrink-0">
        
        {/* Photography Card with Signature Drop Shadow */}
        <div className="relative w-full h-[145px] sm:h-[155px] rounded-[18px] overflow-hidden apple-product-shadow mb-3 bg-[#ffffff] border border-[#e0e0e0]">
          <img 
            src="https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80" 
            alt="Việt Nam Travel" 
            className="w-full h-full object-cover"
          />
          {/* Subtle Gradient Vignette Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#000000]/65 via-transparent to-transparent flex flex-col justify-end p-3.5 text-left">
            <span className="text-[10px] font-semibold text-[#ffffff]/80 uppercase tracking-wider">Hành trình khám phá</span>
            <p className="text-[15px] font-semibold text-[#ffffff] tracking-tight">Việt Nam diệu kỳ</p>
          </div>
        </div>

        {/* SF Pro Display Brand Title */}
        <div className="flex items-center space-x-1 mb-0.5">
          <h1 className="text-[24px] font-bold text-[#1d1d1f] tracking-tight">
            TripMate<span className="text-[#0066cc]">.</span>
          </h1>
        </div>
        <p className="text-[12px] text-[#7a7a7a] max-w-[280px]">
          Lên lịch trình thông minh, cùng bạn bè trên mọi nẻo đường.
        </p>
      </section>

      {/* ==================== 2. WHITE UTILITY CARD BOTTOM CONTAINER ==================== */}
      <section className="relative z-20 bg-[#ffffff] rounded-t-[28px] border-t border-[#e0e0e0] pt-3 pb-6 flex flex-col justify-start overflow-hidden shrink-0 w-full mt-2 shadow-sm">
        
        {/* Apple Drag Handle Bar */}
        <div className="w-9 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-2.5 shrink-0" />

        {/* Segmented Control Pill: [ Đăng nhập ] | [ Đăng ký ] */}
        <div className="mx-5 relative bg-[#f5f5f7] rounded-full p-1 mb-3 border border-[#e0e0e0] shrink-0 select-none">
          {/* Sliding Pill Indicator */}
          <div 
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[#ffffff] rounded-full border border-[#e0e0e0] transition-transform duration-300 pointer-events-none shadow-2xs ${
              activeTab === 'register' ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
            }`}
          />
          
          <div className="relative grid grid-cols-2 text-center text-[13px] z-10">
            <button 
              type="button" 
              onClick={() => setActiveTab('login')} 
              className={`py-1.5 rounded-full transition-colors duration-200 apple-press ${
                activeTab === 'login' ? 'text-[#1d1d1f] font-semibold' : 'text-[#7a7a7a] font-normal hover:text-[#1d1d1f]'
              }`}
            >
              Đăng nhập
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTab('register')} 
              className={`py-1.5 rounded-full transition-colors duration-200 apple-press ${
                activeTab === 'register' ? 'text-[#1d1d1f] font-semibold' : 'text-[#7a7a7a] font-normal hover:text-[#1d1d1f]'
              }`}
            >
              Đăng ký
            </button>
          </div>
        </div>

        {/* ==================== PANEL 1: ĐĂNG NHẬP ==================== */}
        {activeTab === 'login' && (
          <div className="px-5 flex flex-col justify-start anim-sheet-up">
            
            {/* Quick Google Auth */}
            <button 
              type="button" 
              onClick={() => triggerSocialAuth('Google')}
              className="w-full h-11 px-4 bg-[#ffffff] hover:bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-normal rounded-full flex items-center justify-center space-x-2.5 border border-[#e0e0e0] apple-press" 
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" fill="#4285F4"/>
                <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" fill="#34A853"/>
                <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"/>
                <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"/>
              </svg>
              <span>Tiếp tục với Google</span>
            </button>

            {/* Hairline Divider */}
            <div className="relative my-2.5 flex items-center justify-center">
              <div className="border-t border-[#e0e0e0] w-full" />
              <span className="bg-[#ffffff] px-3 text-[11px] font-normal text-[#7a7a7a] absolute">
                hoặc dùng email
              </span>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-2.5">
              <div className="relative">
                <input 
                  type="email" 
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Địa chỉ email" 
                  required
                  className="w-full h-11 px-4 text-[13px] font-normal bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0071e3] transition-all placeholder:text-[#7a7a7a] text-[#1d1d1f] outline-none" 
                />
              </div>

              <div className="relative">
                <input 
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Mật khẩu" 
                  required
                  className="w-full h-11 pl-4 pr-11 text-[13px] font-normal bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0071e3] transition-all placeholder:text-[#7a7a7a] text-[#1d1d1f] outline-none" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Options: Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5 px-1 text-[12px]">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#0066cc] focus:ring-[#0066cc]/20 border-[#e0e0e0]" 
                  />
                  <span className="text-[#7a7a7a]">Ghi nhớ tôi</span>
                </label>
                <button 
                  type="button" 
                  onClick={openForgotModal} 
                  className="text-[#0066cc] hover:underline font-normal apple-press"
                >
                  Quên mật khẩu?
                </button>
              </div>

              {/* Primary Submit Button */}
              <button 
                type="submit" 
                className="w-full h-11 mt-1 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[14px] font-normal rounded-full flex items-center justify-center space-x-2 transition-all apple-press cursor-pointer"
              >
                <span>Đăng nhập</span>
              </button>
            </form>

            <div className="mt-3 text-center">
              <p className="text-[12px] text-[#7a7a7a]">
                Chưa có tài khoản? 
                <button 
                  type="button" 
                  onClick={() => setActiveTab('register')} 
                  className="text-[#0066cc] hover:underline font-semibold ml-1 apple-press"
                >
                  Đăng ký ngay
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ==================== PANEL 2: ĐĂNG KÝ ==================== */}
        {activeTab === 'register' && (
          <div className="px-5 flex flex-col justify-start anim-sheet-up">
            
            {/* Quick Google Auth */}
            <button 
              type="button" 
              onClick={() => triggerSocialAuth('Google')}
              className="w-full h-10 px-4 bg-[#ffffff] hover:bg-[#f5f5f7] text-[#1d1d1f] text-[13px] font-normal rounded-full flex items-center justify-center space-x-2.5 border border-[#e0e0e0] apple-press mb-1" 
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" fill="#4285F4"/>
                <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z" fill="#34A853"/>
                <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z" fill="#FBBC05"/>
                <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" fill="#EA4335"/>
              </svg>
              <span>Đăng ký với Google</span>
            </button>

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="space-y-2 pt-0.5">
              <input 
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Họ và tên" 
                required
                className="w-full h-10 px-4 text-[13px] font-normal bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0071e3] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a]" 
              />
              <input 
                type="email" 
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="Địa chỉ email" 
                required
                className="w-full h-10 px-4 text-[13px] font-normal bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0071e3] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a]" 
              />
              <input 
                type="tel" 
                value={regPhone}
                onChange={(e) => setRegPhone(e.target.value)}
                placeholder="Số điện thoại" 
                required
                className="w-full h-10 px-4 text-[13px] font-normal bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0071e3] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a]" 
              />
              
              <div className="relative">
                <input 
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Mật khẩu" 
                  required
                  className="w-full h-10 pl-4 pr-11 text-[13px] font-normal bg-[#f5f5f7] border border-[#e0e0e0] rounded-full focus:bg-[#ffffff] focus:border-[#0071e3] text-[#1d1d1f] outline-none placeholder:text-[#7a7a7a]" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7a7a7a] hover:text-[#1d1d1f]"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Terms agreement */}
              <div className="px-1 pt-0.5">
                <label className="flex items-center space-x-2 text-[11px] text-[#7a7a7a] select-none cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#0066cc] border-[#e0e0e0]" 
                  />
                  <span>Đồng ý với <span className="text-[#0066cc] underline">Điều khoản</span> TripMate</span>
                </label>
              </div>

              {/* Primary Submit Button */}
              <button 
                type="submit" 
                className="w-full h-11 mt-1 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[14px] font-normal rounded-full flex items-center justify-center space-x-2 transition-all apple-press cursor-pointer"
              >
                <span>Đăng ký tài khoản</span>
              </button>
            </form>

            <div className="mt-2 text-center">
              <p className="text-[12px] text-[#7a7a7a]">
                Đã có tài khoản? 
                <button 
                  type="button" 
                  onClick={() => setActiveTab('login')} 
                  className="text-[#0066cc] hover:underline font-semibold ml-1 apple-press"
                >
                  Đăng nhập
                </button>
              </p>
            </div>
          </div>
        )}

      </section>

      {/* ==================== 3. FORGOT PASSWORD BOTTOM SHEET MODAL ==================== */}
      {/* PROMPT: Giao diện mới có tính năng quên mật khẩu không được xoá */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-xs flex flex-col justify-end transition-opacity duration-300">
          <div className="bg-[#ffffff] rounded-t-[32px] p-5 pb-6 border-t border-[#e0e0e0] shadow-2xl max-h-[85vh] overflow-y-auto no-scrollbar anim-sheet-up">
            
            {/* Drag Handle Bar */}
            <div className="w-10 h-1 bg-[#e0e0e0] rounded-full mx-auto mb-3" />

            {/* STEP 1: NHẬP EMAIL */}
            {forgotStep === 1 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-[#1d1d1f]">Khôi phục mật khẩu</h3>
                      <p className="text-[11px] text-[#7a7a7a]">Bước 1/3: Nhập email</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={closeForgotModal}
                    className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] apple-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[12px] text-[#7a7a7a] leading-relaxed">
                  Nhập địa chỉ email đăng ký tài khoản TripMate. Chúng tôi sẽ gửi mã OTP gồm 6 chữ số để xác thực tài khoản của bạn.
                </p>

                <form onSubmit={handleSendOtp} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#7a7a7a] uppercase">Email đăng ký</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nguyenvana@gmail.com"
                        className="w-full h-10 pl-10 pr-3 text-[13px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
                      />
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={closeForgotModal}
                      className="flex-1 h-10 bg-[#f5f5f7] hover:bg-[#e0e0e0] text-[#1d1d1f] text-[13px] font-medium rounded-full apple-press"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-10 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[13px] font-semibold rounded-full apple-press flex items-center justify-center space-x-1"
                    >
                      <span>Gửi mã xác thực</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 2: NHẬP MÃ OTP */}
            {forgotStep === 2 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-[#1d1d1f]">Xác thực mã OTP</h3>
                      <p className="text-[11px] text-[#7a7a7a]">Bước 2/3: Kiểm tra mã</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={closeForgotModal}
                    className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] apple-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[12px] text-[#7a7a7a]">
                  Mã xác nhận 6 số đã được gửi tới: <strong className="text-[#1d1d1f]">{forgotEmail}</strong>
                </p>

                {/* Demo OTP Banner Card */}
                <div className="bg-[#0066cc]/10 border border-[#0066cc]/25 rounded-2xl p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold text-[#0066cc] uppercase tracking-wider block">
                      Mã OTP Demo thử nghiệm
                    </span>
                    <span className="font-mono text-[17px] font-black text-[#0066cc] tracking-[4px]">
                      {demoOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleQuickFillOtp}
                    className="px-3 py-1.5 bg-[#ffffff] text-[#0066cc] text-[11px] font-bold rounded-lg border border-[#0066cc]/30 shadow-xs hover:bg-[#0066cc]/5 apple-press"
                  >
                    Điền nhanh
                  </button>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#7a7a7a] uppercase">Nhập mã 6 chữ số</label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-3" />
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value)}
                        placeholder="••••••"
                        className="w-full h-11 pl-10 pr-3 text-center tracking-[6px] font-mono text-[16px] font-bold bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] px-1 text-[#7a7a7a]">
                    <span>Không nhận được mã?</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-[#0066cc] font-semibold hover:underline flex items-center space-x-1 apple-press"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Gửi lại mã</span>
                    </button>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="w-24 h-10 bg-[#f5f5f7] hover:bg-[#e0e0e0] text-[#1d1d1f] text-[13px] font-medium rounded-full apple-press flex items-center justify-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Lại</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-10 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[13px] font-semibold rounded-full apple-press"
                    >
                      Xác thực OTP
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 3: TẠO MẬT KHẨU MỚI */}
            {forgotStep === 3 && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-full bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-bold text-[#1d1d1f]">Đặt mật khẩu mới</h3>
                      <p className="text-[11px] text-[#7a7a7a]">Bước 3/3: Tạo mật khẩu</p>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={closeForgotModal}
                    className="w-7 h-7 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[#7a7a7a] hover:text-[#1d1d1f] apple-press"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[12px] text-[#7a7a7a]">
                  Vui lòng tạo mật khẩu mới có tối thiểu 6 ký tự để bảo vệ tài khoản của bạn.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#7a7a7a] uppercase">Mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-3" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="w-full h-10 pl-10 pr-10 text-[13px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-[#7a7a7a] hover:text-[#1d1d1f]"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#7a7a7a] uppercase">Xác nhận mật khẩu mới</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-[#7a7a7a] absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full h-10 pl-10 pr-10 text-[13px] bg-[#f5f5f7] border border-[#e0e0e0] rounded-xl focus:bg-[#ffffff] focus:border-[#0066cc] outline-none text-[#1d1d1f]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-[#7a7a7a] hover:text-[#1d1d1f]"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep(2)}
                      className="w-24 h-10 bg-[#f5f5f7] hover:bg-[#e0e0e0] text-[#1d1d1f] text-[13px] font-medium rounded-full apple-press flex items-center justify-center space-x-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Lại</span>
                    </button>
                    <button
                      type="submit"
                      className="flex-1 h-10 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[13px] font-semibold rounded-full apple-press"
                    >
                      Cập nhật mật khẩu
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* STEP 4: HOÀN TẤT THÀNH CÔNG */}
            {forgotStep === 4 && (
              <div className="space-y-4 py-4 text-center">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-[17px] font-bold text-[#1d1d1f]">Đặt lại mật khẩu thành công!</h3>
                  <p className="text-[12px] text-[#7a7a7a] max-w-[270px] mx-auto leading-relaxed">
                    Mật khẩu của bạn đã được cập nhật thành công. Mật khẩu mới sẽ tự động được điền vào form đăng nhập.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleFinishReset}
                  className="w-full h-11 bg-[#0066cc] hover:bg-[#0071e3] text-[#ffffff] text-[13px] font-semibold rounded-full apple-press shadow-xs"
                >
                  Đăng nhập với mật khẩu mới
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
