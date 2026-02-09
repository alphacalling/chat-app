import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import TOTPVerificationModal from "./TOTPVerificationModal";

const Login = () => {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim() || !password.trim()) {
      setError("Please enter phone number and password");
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(phone, password);

      // If TOTP is required, show modal
      if (result?.requiresTOTP) {
        setPendingUser(result.user);
        setShowTOTPModal(true);
      }
      // Otherwise, login is complete (user is set in context)
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTOTPVerify = async (totpToken: string) => {
    try {
      const result = await login(phone, password, totpToken);
      if (!result?.requiresTOTP) {
        setShowTOTPModal(false);
        setPendingUser(null);
      }
    } catch (err: any) {
      throw err; // Let modal handle the error
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300 delay-200">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            WhatsApp
          </h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 space-y-6 border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom duration-500 delay-300"
        >
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-in slide-in-from-left duration-300">
              {error}
            </div>
          )}

          {/* Phone Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-gray-900/50 border-gray-700 focus:border-green-500 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Password Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-900/50 border-gray-700 focus:border-green-500 pr-10 text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              "Sign In"
            )}
          </Button>

          {/* Register Link */}
          <div className="text-center pt-4">
            <p className="text-gray-400 text-sm">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-green-500 hover:text-green-400 font-medium transition-colors"
              >
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>

      {/* TOTP Verification Modal */}
      <TOTPVerificationModal
        open={showTOTPModal}
        onClose={() => {
          setShowTOTPModal(false);
          setPendingUser(null);
        }}
        onVerify={handleTOTPVerify}
        userName={pendingUser?.name}
      />
    </div>
  );
};

export default Login;
