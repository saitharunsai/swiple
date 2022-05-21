import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Form, Input, message, Modal, Row, Select,
} from 'antd';
import {
  getActionsJsonSchema, getUsers, postAction, putAction,
} from '../../../Api';
import AsyncButton from '../../../components/AsyncButton';

import ajv from '../../../JsonSchemaFormValidator';

const { Option } = Select;
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

function ActionModal({
  visible, type, editedAction, onCancel, onFormSubmit,
}) {
  const [refreshActionJsonSchema, setRefreshActionJsonSchema] = useState(true);
  const [actionJsonSchema, setActionJsonSchema] = useState([]);
  const [users, setUsers] = useState([]);
  const [refreshUsers, setRefreshUsers] = useState(true);
  const [selectedAction, setSelectedAction] = useState('');

  const [form] = Form.useForm();

  useEffect(() => {
    if (refreshActionJsonSchema) {
      getActionsJsonSchema()
        .then((response) => {
          if (response.status === 200) {
            setActionJsonSchema(response.data);
            setRefreshActionJsonSchema(false);
            // setActions(response.data.filter((item) => item.action_name === datasourceId)[0]);
          } else {
            message.error('An error occurred while retrieving data sources schema.', 5);
          }
        });
    }
  }, [refreshActionJsonSchema, setRefreshActionJsonSchema]);

  useEffect(() => {
    if (refreshUsers) {
      getUsers()
        .then((response) => {
          if (response.status === 200) {
            console.log(response.data);
            setUsers(response.data);
          } else {
            message.error('An error occurred while retrieving users.', 5);
          }
          setRefreshUsers(false);
        });
    }
  }, [refreshUsers, setRefreshUsers]);

  useEffect(() => {
    if (type === UPDATE_TYPE && editedAction !== null) {
      form.setFieldsValue(editedAction);
    }
  }, [type, UPDATE_TYPE, editedAction]);

  const createOrUpdateActionRequest = async (data) => {
    const payload = data;
    const actionName = payload.action_name;
    const actionType = payload.action_type;
    delete payload.action_name;

    delete payload.action_type;
    const transformedPayload = {
      action_name: actionName,
      action_type: actionType,
      kwargs: {
        ...payload,
      },
    };

    console.log(transformedPayload);

    if (type === CREATE_TYPE) {
      return postAction(transformedPayload).then((response) => response);
    }
    return putAction(transformedPayload, editedAction.key).then((response) => response);
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
      const { status, data } = await createOrUpdateActionRequest(values);

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

  const actionOptions = () => actionJsonSchema.map((item) => (
    <Option
      key={item.title}
      value={item.title}
      label={item.title}
    >
      <Row align="start" style={{ alignItems: 'center', color: 'black' }}>
        {item.title}
      </Row>
    </Option>
  ));

  const onCancelInternal = () => {
    // parent event callback
    onCancel();
    form.resetFields();
    setSelectedAction('');
  };

  const handleNumberInput = (value, prop) => {
    const obj = {};
    if (value !== '') {
      obj[prop] = parseInt(value, 10);
      form.setFieldsValue(obj);
    }
  };

  const buildValidationErrors = (errorList) => {
    let errorString = '';
    for (let i = 0; i < errorList.length; i += 1) {
      const { message } = errorList[i];
      if (message && !message.includes('unknown keyword')) {
        errorString += `${message}\n`;
      }
    }
    return errorString;
  };

  const formInputType = (propObj, placeholder, formItem) => {
    if (propObj?.enum) {
      return (
        <Select>
          {
            propObj.enum.map((item) => <Option key={item} value={item}>{item}</Option>)
          }
        </Select>
      );
    }

    if (propObj.type === 'integer') {
      return (
        <Input
          placeholder={placeholder}
          onChange={(e) => handleNumberInput(e.target.value, formItem)}
        />
      );
    }
    return (
      <Input placeholder={placeholder} />
    );
  };

  const buildForm = () => {
    // Don't show these form items in the generated form
    const ignoredFormItem = ['key', 'create_date', 'created_by', 'modified_date', 'action_name', 'action_type'];

    if (selectedAction !== '') {
      return actionJsonSchema.map((formItemObj) => {
        if (selectedAction === formItemObj.title) {
          return Object.keys(formItemObj.properties).map((formItem) => {
            if (!ignoredFormItem.includes(formItem)) {
              const propObj = formItemObj.properties[formItem];
              const placeholder = propObj.placeholder ? propObj.placeholder : null;
              return (
                <Form.Item
                  key={propObj.title}
                  label={propObj.title}
                  name={formItem}
                  tooltip={propObj.description ? propObj.description : null}
                  rules={[
                    formItemObj.required.includes(formItem)
                      ? { required: true, message: 'required field.' }
                      : null,
                    {
                      validator: async (rule, value) => {
                        const validate = ajv.compile(propObj);
                        console.log(validate);
                        console.log(validate.errors);
                        const valid = validate(value);
                        // no need to validate undefined values as we have 'required' rule above
                        if (value !== undefined && !valid) {
                          throw new Error(buildValidationErrors(validate.errors));
                        }
                      },
                    },
                  ]}
                >
                  {formInputType(propObj, placeholder, formItem)}
                </Form.Item>
              );
            }
            return null;
          });
        }
        return null;
      });
    }
    return null;
  };

  return (
    <Modal
      title={type === CREATE_TYPE ? 'Create Action' : 'Update Action'}
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
          label="Action Name"
          name="action_name"
          rules={[
            {
              required: true,
              message: 'Enter a action name',
            },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Action Type"
          name="action_type"
          rules={[
            {
              required: true,
              message: 'Select the action type',
            },
          ]}
        >
          <Select
            onChange={(value) => setSelectedAction(value)}
          >
            {actionOptions()}
          </Select>
        </Form.Item>
        {buildForm()}
        <Row style={{ minHeight: 25 }} justify="start" align="top">
          {/* {getResponseStatus()} */}
        </Row>
      </Form>
    </Modal>
  );
}

ActionModal.defaultProps = {
  visible: false,
  editedAction: {},
};

ActionModal.propTypes = {
  visible: PropTypes.bool,
  type: PropTypes.oneOf(['', CREATE_TYPE, UPDATE_TYPE]).isRequired,
  editedAction: PropTypes.objectOf(Object),
  onCancel: PropTypes.func.isRequired,
  onFormSubmit: PropTypes.func.isRequired,
};

export default ActionModal;
