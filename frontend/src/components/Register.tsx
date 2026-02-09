import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../apis/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Eye, EyeOff, UserPlus, Sparkles } from "lucide-react";
import TOTPSetupModal from "./TOTPSetupModal";
import { useAuth } from "../context/useAuth";

const Register = () => {
  const { refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTOTP, setShowTOTP] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/auth/register", {
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
      });

      console.log(
        "✅ Registered and logged in, tokens stored in httpOnly cookies",
      );
      // Set user in auth context (cookies already set by backend)
      await refreshUser();
      setShowTOTP(true);
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center from-whatsapp-light bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in duration-700 slide-in-from-bottom-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative w-20 h-20 bg-gradient-to-br from-whatsapp-green to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-whatsapp-green/30 animate-in zoom-in duration-500 delay-100">
            <UserPlus className="w-10 h-10 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-whatsapp-green via-green-600 to-green-500 bg-clip-text text-transparent mb-2">
            Create Account
          </h1>
          <p className="text-whatsapp-secondary text-base">
            Join WhatsApp to start messaging
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-600/50 backdrop-blur-md rounded-3xl p-8 space-y-5 border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom-8 duration-700 delay-200"
        >
          {/* Error */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm animate-in slide-in-from-left duration-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-2 group">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              Full Name
              <span className="text-whatsapp-green">*</span>
            </label>
            <Input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green focus:ring-4 focus:ring-whatsapp-green/10 text-whatsapp-text placeholder:text-whatsapp-secondary transition-all duration-300 h-12 rounded-xl"
            />
          </div>

          {/* Phone Input */}
          <div className="space-y-2 group">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              Phone Number
              <span className="text-whatsapp-green">*</span>
            </label>
            <Input
              type="tel"
              name="phone"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
              required
              className="bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green focus:ring-4 focus:ring-whatsapp-green/10 text-whatsapp-text placeholder:text-whatsapp-secondary transition-all duration-300 h-12 rounded-xl"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2 group">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              Password
              <span className="text-whatsapp-green">*</span>
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green focus:ring-4 focus:ring-whatsapp-green/10 text-whatsapp-text placeholder:text-whatsapp-secondary pr-12 transition-all duration-300 h-12 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-whatsapp-secondary hover:text-whatsapp-green transition-all duration-300 hover:scale-110"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-2 group">
            <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              Confirm Password
              <span className="text-whatsapp-green">*</span>
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="bg-whatsapp-light/50 border-2 border-whatsapp-border focus:border-whatsapp-green focus:ring-4 focus:ring-whatsapp-green/10 text-whatsapp-text placeholder:text-whatsapp-secondary pr-12 transition-all duration-300 h-12 rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-whatsapp-secondary hover:text-whatsapp-green transition-all duration-300 hover:scale-110"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-whatsapp-green via-green-500 to-green-600 hover:from-green-600 hover:via-whatsapp-green hover:to-green-500 text-white font-semibold shadow-xl shadow-whatsapp-green/30 mt-6 h-12 rounded-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-whatsapp-green/40"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-3 border-white border-t-transparent rounded-full"></div>
                <span>Creating your account...</span>
              </div>
            ) : (
              <span className="flex items-center gap-2">
                Create Account
                <Sparkles className="h-4 w-4" />
              </span>
            )}
          </Button>

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-whatsapp-secondary text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-whatsapp-green hover:text-green-600 font-semibold transition-colors duration-300 hover:underline underline-offset-2"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* TOTP Setup Modal */}
      <TOTPSetupModal
        open={showTOTP}
        onClose={() => {
          setShowTOTP(false);
          navigate("/");
        }}
        onComplete={() => {
          setShowTOTP(false);
          navigate("/");
        }}
      />
    </div>
  );
};

export default Register;
