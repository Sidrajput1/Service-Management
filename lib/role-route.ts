export function getRoleHome(role?:string | null){
    switch (role){
        case "admin":
        case "dispatcher":
            return "/admin/dashboard"
        case "technician":
            return "/technician/dashboard"
        case "service_provider":
            return "/service-provider";
        case "customer":
            return "/customer"
        default:
            return "/profile/complete";
    }
}