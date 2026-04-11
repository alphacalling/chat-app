import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authAPI, getErrorMessage } from "../apis/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  MessageCircle,
  ArrowLeft,
  Phone,
  KeyRound,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Step = "phone" | "reset" | "success";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Please enter your phone number");
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.forgotPassword(phone);
      setStep("reset");
    } catch (err: any) {
      setError(getErrorMessage(err, "Could not process your request. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (totpToken.length < 6) {
      setError("Please enter a valid 6-digit TOTP code or backup code");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword({
        phone,
        totpToken,
        newPassword,
      });
      setStep("success");
    } catch (err: any) {
      setError(getErrorMessage(err, "Password reset failed. Please check your code and try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-br from-green-500 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300 delay-200">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Reset Password
          </h1>
          <p className="text-gray-400">
            {step === "phone" && "Enter your phone number to get started"}
            {step === "reset" &&
              "Verify with your authenticator app to reset password"}
            {step === "success" && "Your password has been reset"}
          </p>
        </div>

        {/* Step 1: Phone */}
        {step === "phone" && (
          <form
            onSubmit={handlePhoneSubmit}
            className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 space-y-6 border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom duration-500 delay-300"
          >
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-in slide-in-from-left duration-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Phone className="h-4 w-4 text-green-400" />
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="Enter your registered phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-gray-900/50 border-gray-700 focus:border-green-500 text-white placeholder:text-gray-500"
                autoFocus
              />
              <p className="text-xs text-gray-500">
                You must have Two-Factor Authentication (TOTP) enabled on your
                account to reset your password.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Verifying...</span>
                </div>
              ) : (
                "Continue"
              )}
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-gray-400 hover:text-green-400 text-sm font-medium transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* Step 2: TOTP + New Password */}
        {step === "reset" && (
          <form
            onSubmit={handleResetSubmit}
            className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 space-y-6 border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom duration-500"
          >
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-in slide-in-from-left duration-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* TOTP Code */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-400" />
                Authenticator Code
              </label>
              <Input
                value={totpToken}
                onChange={(e) => {
                  setTotpToken(e.target.value.replace(/\D/g, "").slice(0, 8));
                  setError("");
                }}
                placeholder="Enter 6-digit code or backup code"
                maxLength={8}
                className="bg-gray-900/50 border-gray-700 focus:border-green-500 text-center text-2xl font-mono tracking-[0.3em] h-14 text-white placeholder:text-gray-500 placeholder:text-sm placeholder:tracking-normal"
                autoFocus
              />

              {/* Visual dots */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-lg font-mono transition-all duration-300 ${
                      totpToken[idx]
                        ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30"
                        : "bg-gray-900/50 border-gray-700 text-gray-500"
                    }`}
                  >
                    {totpToken[idx] || "\u2022"}
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-center">
                Open your authenticator app and enter the current code
              </p>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-green-400" />
                New Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-green-400" />
                Confirm Password
              </label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-gray-900/50 border-gray-700 focus:border-green-500 text-white placeholder:text-gray-500"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading || totpToken.length < 6}
              className="w-full bg-linear-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span>Resetting...</span>
                </div>
              ) : (
                "Reset Password"
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError("");
                  setTotpToken("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="text-gray-400 hover:text-green-400 text-sm font-medium transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Use a different phone number
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === "success" && (
          <div className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 space-y-6 border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom duration-500 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                Password Reset Successful
              </h2>
              <p className="text-gray-400 text-sm">
                Your password has been updated. You can now sign in with your new
                password.
              </p>
            </div>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-linear-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300"
            >
              Go to Sign In
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
