import {
  Button, Dropdown, Tag, Layout, Menu, message, Modal, Row, Table, Typography,
} from 'antd';
import {
  DeleteFilled, EditFilled, EllipsisOutlined, ExclamationCircleOutlined, PlusOutlined,
} from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import React, { useEffect, useState } from 'react';
import moment from 'moment';
import Section from '../../components/Section';
import TeamModal, { CREATE_TYPE, UPDATE_TYPE } from './components/TeamModal';
import { deleteTeam, getTeams } from '../../Api';

const { Content } = Layout;
const { Title } = Typography;
const { confirm } = Modal;

export default function TeamOverview() {
  const [teamModal, setTeamModal] = useState({ visible: false, type: '' });
  const [refreshTeams, setRefreshTeams] = useState(true);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    if (refreshTeams) {
      getTeams()
        .then((response) => {
          if (response.status === 200) {
            setTeams(response.data);
          } else {
            message.error('An error occurred while retrieving data sources.', 5);
          }
          setRefreshTeams(false);
        });
    }
  }, [refreshTeams, setRefreshTeams]);

  const openTeamModal = (modalType, record = null) => {
    let team = null;
    if (modalType === UPDATE_TYPE) {
      [team] = teams.filter((item) => item.key === record.key);
    }

    setTeamModal({
      visible: true, type: modalType, team,
    });
  };

  const removeTeam = (row) => new Promise((resolve, reject) => {
    deleteTeam(row.key).then(() => {
      setTeams(teams.filter((item) => item.key !== row.key));
      resolve();
    }).catch(() => reject());
  });

  const showDeleteModal = (record) => {
    confirm({
      title: 'Delete Team',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you would like to delete this team?',
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        return removeTeam(record);
      },
      onCancel() {},
    });
  };

  const actionMenu = (record) => (
    <Menu>
      <Menu.Item
        key="1"
        icon={<EditFilled />}
        onClick={() => openTeamModal(UPDATE_TYPE, record)}
      >
        Edit
      </Menu.Item>
      <Menu.Item
        key="2"
        onClick={() => showDeleteModal(record)}
        icon={<DeleteFilled style={{ color: 'red' }} />}
      >
        Delete
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: 'Team Name',
      dataIndex: 'team_name',
    },
    {
      title: 'Members',
      dataIndex: 'members',
      render: (text) => (
        <div className="table-scroll-cell">
          {
            text.map((item) => (
              <Tag key={item}>
                {item}
              </Tag>
            ))
          }
        </div>
      ),
    },
    {
      title: 'LAST MODIFIED',
      dataIndex: 'modified_date',
      render: (text) => moment(text.modified_date).local().fromNow(),
    },
    {
      title: '',
      dataIndex: 'action',
      render: (text, record) => (
        <Dropdown
          trigger={['click']}
          overlay={actionMenu(record)}
          placement="bottomRight"
          arrow
        >
          <Button
            type="text"
            icon={<EllipsisOutlined rotate={90} style={{ fontWeight: 'bold', fontSize: '25px' }} />}
          />
        </Dropdown>
      ),
    },
  ];

  return (
    <Content className="site-layout-background">
      <Section
        style={{
          margin: '24px 16px',
          padding: 24,
        }}
      >
        <>
          <Typography style={{ paddingLeft: '16px' }}>
            <Row style={{ alignItems: 'center' }} align="space-between">
              <Title
                className="card-list-header"
                level={4}
              >
                Teams
              </Title>
              <Button
                className="card-list-button-dark"
                style={{ fontWeight: 'bold' }}
                type="primary"
                icon={<PlusOutlined />}
                size="medium"
                onClick={() => openTeamModal(CREATE_TYPE)}
              >
                Team
              </Button>
              <TeamModal
                visible={teamModal.visible}
                type={teamModal.type}
                editedTeam={teamModal.team_name}
                onCancel={() => {
                  setTeamModal({
                    visible: false, type: '', team_name: null, members: [],
                  });
                }}
                onFormSubmit={() => {
                  setTeamModal({
                    visible: false, type: '', team_name: null, members: [],
                  });
                  setRefreshTeams(true);
                }}
              />
            </Row>
          </Typography>
          <Table
            columns={columns}
            dataSource={teams}
            pagination={{ position: ['bottomRight'] }}
            rowKey={() => uuidv4()}
          />
        </>
      </Section>
    </Content>
  );
}
