import { Await, useLoaderData } from '@modern-js/runtime/router';
import { Suspense } from 'react';

const Page = () => {
  const data = useLoaderData();

  return (
    <div id="item">
      User info:
      <Suspense fallback={<div id="loading">loading user data ...</div>}>
        <Await resolve={data.data}>
          {user => {
            return (
              <div id="data">
                name: {user.name}, age: {user.age}
              </div>
            );
          }}
        </Await>
      </Suspense>
    </div>
  );
};

export default Page;
