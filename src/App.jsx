import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";

const statusColors = {
  CLOSED: "text-green-500",
  OPEN: "text-red-500",
  HALF_OPEN: "text-yellow-500",
};

const Dashboard = () => {
  const [metrics, setMetrics] = useState([]);
  const [circuitState, setCircuitState] = useState("CLOSED");
  const [lastResponse, setLastResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: Date.now().toString(),
          productId: "ABC",
          quantity: 1,
        }),
      });
      const data = await response.text();
      setLastResponse(data);

      // 메트릭스 업데이트
      setMetrics((prev) => {
        const newMetric = {
          time: new Date().toLocaleTimeString(),
          success: response.ok ? 1 : 0,
          failure: response.ok ? 0 : 1,
        };
        return [...prev.slice(-9), newMetric];
      });

      // Circuit Breaker 상태 조회
      const stateResponse = await fetch(
        "http://localhost:8081/actuator/circuitbreakers"
      );
      const stateData = await stateResponse.json();
      if (stateData.circuitBreakers?.inventoryService?.state) {
        setCircuitState(stateData.circuitBreakers.inventoryService.state);
      }
    } catch (err) {
      setError(err.message);
      setMetrics((prev) => {
        const newMetric = {
          time: new Date().toLocaleTimeString(),
          success: 0,
          failure: 1,
        };
        return [...prev.slice(-9), newMetric];
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">Resilience4j Dashboard</h1>

        {/* 컨트롤 패널 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={sendRequest}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            Send Request
          </button>

          {/* Circuit Breaker 상태 */}
          <div className="flex items-center gap-2 px-4 py-2 border rounded">
            <span>Circuit Status:</span>
            <span className={`font-bold ${statusColors[circuitState]}`}>
              {circuitState}
            </span>
            {circuitState === "CLOSED" && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            {circuitState === "OPEN" && (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            {circuitState === "HALF_OPEN" && (
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
            )}
          </div>

          {/* 로딩 표시 */}
          {loading && (
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 animate-spin" />
              <span>Processing...</span>
            </div>
          )}
        </div>

        {/* 마지막 응답 */}
        {lastResponse && (
          <div className="mb-6 p-4 bg-gray-50 rounded">
            <h3 className="font-semibold mb-2">Last Response:</h3>
            <code>{lastResponse}</code>
          </div>
        )}

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded">
            <h3 className="font-semibold mb-2">Error:</h3>
            <code>{error}</code>
          </div>
        )}

        {/* 메트릭스 차트 */}
        <div className="bg-white p-4 rounded">
          <h3 className="font-semibold mb-4">Request Metrics</h3>
          <LineChart width={800} height={300} data={metrics}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="success"
              stroke="#48bb78"
              name="Success"
            />
            <Line
              type="monotone"
              dataKey="failure"
              stroke="#f56565"
              name="Failure"
            />
          </LineChart>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
