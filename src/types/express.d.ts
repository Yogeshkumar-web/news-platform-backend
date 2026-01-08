
import { AuthTokenPayload } from "./index";

declare global {
    namespace Express {
        interface User extends AuthTokenPayload {}
    }
}
