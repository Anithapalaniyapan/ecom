import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';
import { UserRole } from '../user.entity';

export function IsRequiredForRole(role: UserRole, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isRequiredForRole',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const userRole = obj.role;
          
          // If the role matches, the field is required
          if (userRole === role) {
            return value !== undefined && value !== null && value !== '';
          }
          
          // If the role doesn't match, the field is optional
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const roleName = role === UserRole.SELLER ? 'seller' : 'customer';
          return `${args.property} is required for ${roleName} registration`;
        },
      },
    });
  };
}

export function IsOptionalForRole(role: UserRole, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOptionalForRole',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const obj = args.object as any;
          const userRole = obj.role;
          
          // If the role doesn't match, the field should be undefined/null
          if (userRole !== role) {
            return value === undefined || value === null || value === '';
          }
          
          // If the role matches, validate the field normally
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const roleName = role === UserRole.SELLER ? 'seller' : 'customer';
          return `${args.property} is only allowed for ${roleName} registration`;
        },
      },
    });
  };
}
