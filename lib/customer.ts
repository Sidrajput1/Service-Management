import Customer from "@/models/customer";
import { ApiAuthError, requireCurrentUser } from "./auth";
import User from "@/models/user";
import { connectToDb } from "./db";


export async function requireCustomerProfile(){
    const user = await requireCurrentUser();

    if(user.role !== "customer"){
        throw new ApiAuthError("Only customers can access this area",403);
    };

    let customer = await Customer.findOne({userId:user._id});

    if(!customer){
        customer = await Customer.create({
            userId:user._id,
            name:user.name || "Customer",
            email:user.email || "",
            phone : user.phone || "",
            addresses:[],
            notes:"",
        });
       // throw new Error("Customer is not found");
    };

    return {user , customer}
};

export async function requireCustomer(userId: string) {
  await connectToDb();

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role !== "customer") {
    throw new Error("Customer access required");
  }

  const customer = await Customer.findOne({
    userId: user._id,
  });

  if (!customer) {
    throw new Error(
      "Customer profile not found"
    );
  }

  return {
    user,
    customer,
  };
}