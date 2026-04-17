export function getRoleHome(role?:string | null){
    switch (role){
        case "admin":
        case "dispatcher":
            return "/admin/dashboard"
        case "technician":
            return "/technician/dashboard"
        case "customer":
            default:
            return "/customer"
    }
}