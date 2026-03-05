import React from "react";

type LoaderTheme = "LIGHT" | "DARK";

interface ApplicationLoaderProps {
  theme: LoaderTheme;
  message?: string;
}

const ApplicationLoader: React.FC<ApplicationLoaderProps> = ({
  theme,
  message = "Loading application...",
}) => {
  return (
    <div
      className={`fixed inset-0 flex flex-col items-center justify-center z-[9999] overflow-hidden ${
        theme === "DARK" ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 animate-pulse ${
            theme === "DARK" ? "bg-blue-500" : "bg-blue-300"
          }`}
        />
        <div
          className={`absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5 animate-pulse ${
            theme === "DARK" ? "bg-purple-500" : "bg-purple-300"
          }`}
          style={{ animationDelay: "1s" }}
        />
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full opacity-5 animate-pulse ${
            theme === "DARK" ? "bg-green-500" : "bg-green-300"
          }`}
          style={{ animationDelay: "2s" }}
        />
      </div>

      <div className="flex flex-col items-center space-y-8 z-10">
        <div className="relative">
          <div
            className={`w-32 h-32 border-2 border-transparent rounded-full animate-spin ${
              theme === "DARK"
                ? "border-t-blue-400 border-r-blue-400"
                : "border-t-blue-500 border-r-blue-500"
            }`}
            style={{ animationDuration: "2s" }}
          />
          <div
            className={`absolute top-2 left-2 w-28 h-28 border-2 border-transparent rounded-full animate-spin ${
              theme === "DARK"
                ? "border-l-purple-400 border-b-purple-400"
                : "border-l-purple-500 border-b-purple-500"
            }`}
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          />
          <div
            className={`absolute top-4 left-4 w-24 h-24 border-2 border-transparent rounded-full animate-spin ${
              theme === "DARK"
                ? "border-t-green-400 border-r-green-400"
                : "border-t-green-500 border-r-green-500"
            }`}
            style={{ animationDuration: "1s" }}
          />

          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div
              className={`relative animate-pulse ${
                theme === "DARK" ? "text-white" : "text-gray-700"
              }`}
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="animate-bounce"
                style={{ animationDuration: "2s" }}
              >
                <path d="M16.375 2H7.621c-.224 0-1.399.065-2.503 1.351C4.031 4.616 4 5.862 4 6v11a2 2 0 0 0 2 2h1l-2 3h2.353l.667-1h8l.677 1H19l-2-3h1a2 2 0 0 0 2-2V6c.001-.188-.032-1.434-1.129-2.665C17.715 2.037 16.509 2 16.375 2M10 4h4v2h-4zM7.5 17a1.5 1.5 0 1 1 .001-3.001A1.5 1.5 0 0 1 7.5 17m9 0a1.5 1.5 0 1 1 .001-3.001A1.5 1.5 0 0 1 16.5 17m1.5-5H6V8h12z" />
              </svg>
            </div>
          </div>

          <div
            className={`absolute top-0 left-0 w-32 h-32 rounded-full border border-dashed opacity-30 animate-ping ${
              theme === "DARK" ? "border-blue-400" : "border-blue-500"
            }`}
            style={{ animationDuration: "3s" }}
          />
        </div>

        <div className="text-center space-y-4">
          <h2
            className={`text-2xl font-bold tracking-wide ${
              theme === "DARK" ? "text-white" : "text-gray-900"
            }`}
          >
            Railway Management System
          </h2>
          <div className="relative">
            <p
              className={`text-lg font-medium ${
                theme === "DARK" ? "text-blue-400" : "text-blue-600"
              }`}
            >
              {message}
            </p>
            <div className="absolute -right-1 top-0 w-0.5 h-6 bg-current animate-pulse" />
          </div>
          <p
            className={`text-sm ${
              theme === "DARK" ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Preparing tracks and train positions
          </p>
        </div>

        <div className="w-80 relative">
          <div
            className={`w-full h-1 rounded-full ${
              theme === "DARK" ? "bg-gray-700" : "bg-gray-300"
            }`}
          >
            <div
              className={`h-1 rounded-full animate-pulse ${
                theme === "DARK"
                  ? "bg-gradient-to-r from-blue-500 to-purple-500"
                  : "bg-gradient-to-r from-blue-400 to-purple-400"
              }`}
              style={{ width: "60%" }}
            />
          </div>
          <div
            className={`absolute -top-2 w-4 h-4 animate-bounce ${
              theme === "DARK" ? "text-blue-400" : "text-blue-500"
            }`}
            style={{
              left: "60%",
              transform: "translateX(-50%)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M16.375 2H7.621c-.224 0-1.399.065-2.503 1.351C4.031 4.616 4 5.862 4 6v11a2 2 0 0 0 2 2h1l-2 3h2.353l.667-1h8l.677 1H19l-2-3h1a2 2 0 0 0 2-2V6c.001-.188-.032-1.434-1.129-2.665C17.715 2.037 16.509 2 16.375 2M10 4h4v2h-4zM7.5 17a1.5 1.5 0 1 1 .001-3.001A1.5 1.5 0 0 1 7.5 17m9 0a1.5 1.5 0 1 1 .001-3.001A1.5 1.5 0 0 1 16.5 17m1.5-5H6V8h12z" />
            </svg>
          </div>
        </div>

        <div className="flex space-x-6">
          {[
            { label: "Tracks", status: "active" },
            { label: "Trains", status: "loading" },
            { label: "Ready", status: "pending" },
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  item.status === "active"
                    ? "bg-green-500 animate-pulse"
                    : item.status === "loading"
                      ? theme === "DARK"
                        ? "bg-blue-400 animate-ping"
                        : "bg-blue-500 animate-ping"
                      : theme === "DARK"
                        ? "bg-gray-600"
                        : "bg-gray-400"
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  theme === "DARK" ? "text-gray-300" : "text-gray-600"
                }`}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ApplicationLoader;
