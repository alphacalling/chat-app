import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../apis/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Eye, EyeOff, UserPlus } from "lucide-react";
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
      const response = await api.post("/auth/register", {
        name: formData.name,
        phone: formData.phone,
        password: formData.password,
      });

      console.log(
        "Registered and logged in, tokens stored in httpOnly cookies",
      );
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
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-gray-900 via-gray-900 to-gray-950 px-4 py-12">
      <div className="w-full max-w-md animate-in fade-in duration-500">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-br from-green-500 to-green-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20 animate-in zoom-in duration-300 delay-200">
            <UserPlus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-linear-to-r from-white to-gray-300 bg-clip-text">
            Create Account
          </h1>
          <p className="text-gray-400">Join Chit-Chat App to start messaging</p>
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

          {/* Name Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Full Name
            </label>
            <Input
              type="text"
              name="name"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
              className="bg-gray-900/50 border-gray-700 focus:border-green-500 text-white placeholder:text-gray-500"
            />
          </div>

          {/* Phone Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Phone Number
            </label>
            <Input
              type="tel"
              name="phone"
              placeholder="Enter your phone number"
              value={formData.phone}
              onChange={handleChange}
              required
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
                name="password"
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
                required
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

          {/* Confirm Password Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="bg-gray-900/50 border-gray-700 focus:border-green-500 pr-10 text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                {showConfirmPassword ? (
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
            disabled={loading}
            className="w-full bg-linear-to-r from-green-500 to-green-400 hover:from-green-400 hover:to-green-500 text-white font-semibold shadow-lg shadow-green-500/20 transition-all duration-300"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Creating account...</span>
              </div>
            ) : (
              "Create Account"
            )}
          </Button>

          {/* Login Link */}
          <div className="text-center pt-4">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-green-500 hover:text-green-400 font-medium transition-colors"
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
