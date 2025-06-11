import { UserProfile } from "@clerk/nextjs";

const UserProfilePage = () => (
  <div className="flex justify-center items-center h-full">
    <UserProfile path="/user-profile" routing="path" />
  </div>
);

export default UserProfilePage; 