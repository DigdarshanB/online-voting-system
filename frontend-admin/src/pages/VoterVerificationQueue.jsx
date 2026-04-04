import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { 
  Badge, 
  Button, 
  Card, 
  Empty, 
  Modal, 
  Spin, 
  Table, 
  Tag, 
  Typography, 
  Space,
  Tooltip,
  Divider,
  Result
} from "antd";
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ExclamationCircleOutlined, 
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const API_BASE_URL = "http://localhost:8000/admin/voters";

export default function VoterVerificationQueue() {
  const [voters, setVoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [dialog, setDialog] = useState(null);

  const fetchVoters = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const { data } = await axios.get(`${API_BASE_URL}/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVoters(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch pending voters");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVoters();
  }, [fetchVoters]);

  const handleAction = async (voterId, action, reason) => {
    try {
      const token = localStorage.getItem("access_token");
      const statusValue = action === "approve" ? "APPROVED" : "REJECTED";
      
      await axios.post(
        `${API_BASE_URL}/verify`,
        { user_id: voterId, status: statusValue, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      fetchVoters();
      setDialog(null);
      setDetailId(null);
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${action} voter`);
    }
  };

  const columns = [
    { title: "Voter Name", dataIndex: "name", key: "name" },
    { title: "Citizenship ID", dataIndex: "citizenshipId", key: "citizenshipId" },
    { title: "Registration Date", dataIndex: "registeredAt", key: "registeredAt" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => setDetailId(record.id)}>View</Button>
          <Button type="primary" success icon={<CheckCircleOutlined />} onClick={() => setDialog({ id: record.id, action: "approve" })}>Approve</Button>
          <Button type="primary" danger icon={<CloseCircleOutlined />} onClick={() => setDialog({ id: record.id, action: "reject" })}>Reject</Button>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Verification Queue</Title>
      <Table 
        dataSource={voters} 
        columns={columns} 
        loading={loading}
        rowKey="id"
      />
      {/* Placeholder for Details and Dialog components */}
      {detailId && <div>Detail for {detailId}</div>}
      {dialog && <div>Dialog for {dialog.action}</div>}
    </div>
  );
}
