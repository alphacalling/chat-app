import { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getErrorMessage } from "../apis/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Eye, EyeOff, MessageCircle } from "lucide-react";
import TOTPVerificationModal, {
  TOTP_RESET_TOKEN_KEY,
} from "./TOTPVerificationModal";

const Login = () => {
  const { login, completeLogin } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showTOTPModal, setShowTOTPModal] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [totpResetToken, setTotpResetToken] = useState<string | null>(null);
  const totpResetTokenRef = useRef<string | null>(null);

  const storeResetToken = useCallback((token: string | null | undefined) => {
    const value = token ?? null;
    totpResetTokenRef.current = value;
    setTotpResetToken(value);
    if (value) {
      sessionStorage.setItem(TOTP_RESET_TOKEN_KEY, value);
    } else {
      sessionStorage.removeItem(TOTP_RESET_TOKEN_KEY);
    }
  }, []);

  const clearPendingSession = useCallback(() => {
    setShowTOTPModal(false);
    setPendingUser(null);
    storeResetToken(null);
  }, [storeResetToken]);

  const refreshResetToken = useCallback(async (): Promise<string | null> => {
    const result = await login(phone, password);
    if (!result.totpResetToken) {
      return null;
    }
    storeResetToken(result.totpResetToken);
    return result.totpResetToken;
  }, [login, phone, password, storeResetToken]);

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

      if (result?.requiresTOTP) {
        setPendingUser(result.user);
        storeResetToken(result.totpResetToken);
        setShowTOTPModal(true);
      }
    } catch (err: any) {
      setError(
        getErrorMessage(err, "Invalid phone number or password. Please try again."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleTOTPVerify = async (totpToken: string) => {
    const result = await login(phone, password, totpToken);
    if (!result?.requiresTOTP) {
      clearPendingSession();
    }
  };

  const handleResetSuccess = (user: any) => {
    completeLogin(user);
    clearPendingSession();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-br from-green-500 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300 delay-200">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-linear-to-r from-white to-gray-300 bg-clip-text">
            Chit-Chat Application
          </h1>
          <p className="text-gray-400">Sign in to your account</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-gray-800/50 backdrop-blur-md rounded-2xl p-8 space-y-6 border border-gray-700/50 shadow-2xl animate-in slide-in-from-bottom duration-500 delay-300"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm animate-in slide-in-from-left duration-300">
              {error}
            </div>
          )}

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

          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-green-500 hover:text-green-400 text-sm font-medium transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-linear-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300"
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

      <TOTPVerificationModal
        open={showTOTPModal}
        onClose={clearPendingSession}
        onVerify={handleTOTPVerify}
        totpResetToken={totpResetToken ?? totpResetTokenRef.current}
        onRefreshResetToken={refreshResetToken}
        onResetSuccess={handleResetSuccess}
        userName={pendingUser?.name}
      />
    </div>
  );
};

export default Login;
