import bcryptjs from "bcryptjs";
import { Schema, model } from "mongoose";
import { IUser } from "../domain/user.entity";

const userSchema = new Schema<any>(
  {
    name: { type: String, required: true },
    email: { type: String, required: false, unique: true },
    phone: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "employee", "platform-admin"],
      default: "employee",
    },
    shopId: { type: Schema.Types.ObjectId, ref: "Shop", required: false },
  },
  { timestamps: true },
);

// We explicitly type 'this' and remove the 'next' parameter
userSchema.pre<IUser>("save", async function () {
  // If password isn't modified, we just return (equivalent to next())
  if (!this.isModified("password")) return;

  // Narrow the type to ensure password is a string
  if (this.password) {
    this.password = await bcryptjs.hash(this.password, 12);
  }

  // No next() needed! The resolution of this async function
  // tells Mongoose to proceed to the save operation.
});
// userSchema.plugin(tenantPlugin);

export const UserModel = model<IUser>("User", userSchema);
