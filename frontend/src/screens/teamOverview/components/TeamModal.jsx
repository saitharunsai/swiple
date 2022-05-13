import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Input, message, Modal, Row, Select, Space, Typography,
} from 'antd';
import { postTeam, putTeam } from '../../../Api';

import AsyncButton from '../../../components/AsyncButton';

const { Option } = Select;
const { Text } = Typography;
const layout = {
  labelCol: {
    span: 8,
  },
  wrapperCol: {
    span: 16,
  },
};

export const CREATE_TYPE = 'CREATE';
export const UPDATE_TYPE = 'UPDATE';

function TeamModal({
  visible, type, editedTeam, onCancel, onFormSubmit,
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (type === UPDATE_TYPE && editedTeam !== null) {
      form.setFieldsValue(editedTeam);
    }
  }, [type, UPDATE_TYPE, editedTeam]);

  const createOrUpdateDatasourceRequest = async (payload) => {
    if (type === CREATE_TYPE) {
      return postTeam(payload).then((response) => response);
    }
    return putTeam(payload, editedTeam.key).then((response) => response);
  };

  const isFormComplete = () => form.validateFields()
    .then((values) => ({ complete: true, values }))
    .catch((validationInfo) => {
      console.log('Validations failed: ', validationInfo);
      return { complete: false, values: {} };
    });

  const onFormSubmitInternal = async () => {
    const { complete, values } = await isFormComplete();
    if (complete) {
      const { status, data } = await createOrUpdateDatasourceRequest(values);

      if (status === 200) {
        setTimeout(() => {
          // event callback to parent
          onFormSubmit();
          form.resetFields();
        }, 500);
      } else if (status === undefined) {
        message.error('API appears to be down.', 5);
      } else if (data?.detail !== undefined) {
      } else {
        message.error('An unknown error occurred.', 5);
      }
    } else {
    }
    return null;
  };

  const onCancelInternal = () => {
    // parent event callback
    onCancel();
    form.resetFields();
  };

  return (
    <Modal
      title={type === CREATE_TYPE ? 'Create Team' : 'Update Team'}
      visible={visible}
      onCancel={() => {
        onCancelInternal();
        return onCancel();
      }}
      width={600}
      bodyStyle={{
        maxHeight: '900px',
        overflowWrap: 'break-word',
        overflow: 'auto',
      }}
      wrapClassName="wrapper-class"
      footer={[
        <Button
          key="cancel"
          onClick={() => {
            onCancelInternal();
            return onCancel();
          }}
        >
          Cancel
        </Button>,
        <AsyncButton
          key="submit"
          type="primary"
          onClick={() => {
            console.log('submit');
            return onFormSubmitInternal();
          }}
        >
          {type === CREATE_TYPE ? 'Create' : 'Update'}
        </AsyncButton>,
      ]}
    >
      <Form
        {...layout}
        name="dynamic_form_nest_item"
        form={form}
        layout="vertical"
        size="large"
        preserve={false}
      >
        <Form.Item
          label="Team Name"
          name="team_name"
          rules={[
            {
              required: true,
              message: 'Enter a team name',
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Members"
          name="members"
          rules={[
            {
              required: true,
              message: 'Select the team members',
            },
          ]}
        >
          <Select mode="multiple" allowClear />
        </Form.Item>
      </Form>
    </Modal>
  );
}

TeamModal.defaultProps = {
  visible: false,
  editedTeam: {},
};

TeamModal.propTypes = {
  visible: PropTypes.bool,
  type: PropTypes.oneOf(['', CREATE_TYPE, UPDATE_TYPE]).isRequired,
  editedTeam: PropTypes.objectOf(Object),
  onCancel: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
};

export default TeamModal;
