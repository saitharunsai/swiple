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
import ActionModal, { CREATE_TYPE, UPDATE_TYPE } from './components/actionModal';
import { deleteAction, getActions } from '../../Api';

const { Content } = Layout;
const { Title } = Typography;
const { confirm } = Modal;

export default function actionOverview() {
  const [actionModal, setActionModal] = useState({ visible: false, type: '' });
  const [refreshActions, setRefreshActions] = useState(true);
  const [actions, setActions] = useState([]);

  useEffect(() => {
    if (refreshActions) {
      getActions()
        .then((response) => {
          if (response.status === 200) {
            setActions(response.data);
          } else {
            message.error('An error occurred while retrieving data sources.', 5);
          }
          setRefreshActions(false);
        });
    }
  }, [refreshActions, setRefreshActions]);

  const openActionModal = (modalType, record = null) => {
    let action = null;
    if (modalType === UPDATE_TYPE) {
      [action] = actions.filter((item) => item.key === record.key);
    }

    setActionModal({
      visible: true, type: modalType, action,
    });
  };

  const removeAction = (row) => new Promise((resolve, reject) => {
    deleteAction(row.key).then(() => {
      setActions(actions.filter((item) => item.key !== row.key));
      resolve();
    }).catch(() => reject());
  });

  const showDeleteModal = (record) => {
    confirm({
      title: 'Delete Action',
      icon: <ExclamationCircleOutlined />,
      content: 'Are you sure you would like to delete this action?',
      okText: 'Delete',
      okType: 'danger',
      onOk() {
        return removeAction(record);
      },
      onCancel() {},
    });
  };

  const actionMenu = (record) => (
    <Menu>
      <Menu.Item
        key="1"
        icon={<EditFilled />}
        onClick={() => openActionModal(UPDATE_TYPE, record)}
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
      title: 'Action Name',
      dataIndex: 'action_name',
    },
    {
      title: 'Action Type',
      dataIndex: 'action_type',
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
                Actions
              </Title>
              <Button
                className="card-list-button-dark"
                style={{ fontWeight: 'bold' }}
                type="primary"
                icon={<PlusOutlined />}
                size="medium"
                onClick={() => openActionModal(CREATE_TYPE)}
              >
                Action
              </Button>
              <ActionModal
                visible={actionModal.visible}
                type={actionModal.type}
                editedAction={actionModal.datasource}
                onCancel={() => {
                  setActionModal({
                    visible: false, type: '', team_name: null, members: [],
                  });
                }}
                onFormSubmit={() => {
                  setActionModal({
                    visible: false, type: '', team_name: null, members: [],
                  });
                  setRefreshActions(true);
                }}
              />
            </Row>
          </Typography>
          <Table
            columns={columns}
            dataSource={actions}
            pagination={{ position: ['bottomRight'] }}
            rowKey={() => uuidv4()}
          />
        </>
      </Section>
    </Content>
  );
}
