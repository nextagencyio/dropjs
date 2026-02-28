export {
  FieldType,
  registerFieldType,
  getFieldType,
  getRegisteredFieldTypes,
} from './field-type.js';
export type { FieldSchema, FieldSettings } from './field-type.js';

export { fieldStorage, fieldTableName } from './field-storage.js';

export {
  validateFieldValue,
  validateEntity,
} from './validation.js';
export type { ValidationError, ValidationResult } from './validation.js';

// Built-in field types
export { StringField } from './types/string.js';
export { TextLongField } from './types/text-long.js';
export { IntegerField } from './types/integer.js';
export { FloatField } from './types/float.js';
export { DecimalField } from './types/decimal.js';
export { BooleanField } from './types/boolean.js';
export { EmailField } from './types/email.js';
export { TimestampField } from './types/timestamp.js';
export { DateField } from './types/date.js';
export { EntityReferenceField } from './types/entity-reference.js';
export { ImageField } from './types/image.js';
export { FileField } from './types/file.js';
export { ListStringField } from './types/list-string.js';
export { LinkField } from './types/link.js';
export { TelephoneField } from './types/telephone.js';
export { ColorField } from './types/color.js';
export { JsonField } from './types/json.js';
export { TextWithSummaryField } from './types/text-with-summary.js';

// Register all built-in field types
import { registerFieldType } from './field-type.js';
import { StringField } from './types/string.js';
import { TextLongField } from './types/text-long.js';
import { IntegerField } from './types/integer.js';
import { FloatField } from './types/float.js';
import { DecimalField } from './types/decimal.js';
import { BooleanField } from './types/boolean.js';
import { EmailField } from './types/email.js';
import { TimestampField } from './types/timestamp.js';
import { DateField } from './types/date.js';
import { EntityReferenceField } from './types/entity-reference.js';
import { ImageField } from './types/image.js';
import { FileField } from './types/file.js';
import { ListStringField } from './types/list-string.js';
import { LinkField } from './types/link.js';
import { TelephoneField } from './types/telephone.js';
import { ColorField } from './types/color.js';
import { JsonField } from './types/json.js';
import { TextWithSummaryField } from './types/text-with-summary.js';

registerFieldType(StringField);
registerFieldType(TextLongField);
registerFieldType(IntegerField);
registerFieldType(FloatField);
registerFieldType(DecimalField);
registerFieldType(BooleanField);
registerFieldType(EmailField);
registerFieldType(TimestampField);
registerFieldType(DateField);
registerFieldType(EntityReferenceField);
registerFieldType(ImageField);
registerFieldType(FileField);
registerFieldType(ListStringField);
registerFieldType(LinkField);
registerFieldType(TelephoneField);
registerFieldType(ColorField);
registerFieldType(JsonField);
registerFieldType(TextWithSummaryField);
