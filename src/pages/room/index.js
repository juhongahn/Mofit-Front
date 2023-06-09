import { useState, useEffect, createContext, useRef } from "react";
import { useRouter } from "next/router";
import Navbar from "../../components/Navbar";
import axios from "axios";
import CreateRoomModal from "../../components/room/CreateRoomModal";
import Cookies from "js-cookie";
import LayoutAuthenticated from "../../components/LayoutAuthticated";
import { refreshToken } from "public/refreshToken";
import { useRecoilState } from "recoil";
import { isRoomHostState } from "../../recoil/states";
import { currSessionId } from "../../recoil/currSessionId";
import { gameModeName } from "../../recoil/gameModeName";
import { gamePlayTime } from "../../recoil/gamePlayTime";
import Swal from 'sweetalert2'
import { inroomState } from "../../recoil/imroomState";
import Loading from "../../components/Loading"



export default function RoomList() {
  useEffect(() => {
    const key = localStorage.getItem("refresh");
    if (key === '1') {
      window.location.reload()
      localStorage.setItem("refresh", '0');
    }

  }, []);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const roomHostContext = createContext({ roomName: "", isHost: false });
  const [isRoomHost, setIsRoomHost] = useRecoilState(isRoomHostState);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roomList, setRoomList] = useState([]);
  const [isAlert, setIsAlert] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currSession, setCurrSessionId] = useRecoilState(currSessionId);
  const [myInRoomState, setInRoomState] = useRecoilState(inroomState);
	const [roomGameModeName, setRoomGameModeName] = useRecoilState(gameModeName);
  const [timeOfGamePlay, setTimeOfGamePlay] = useRecoilState(gamePlayTime);

  const userIdRef = useRef('');

  useEffect(() => {
    if (window)
      userIdRef.current = localStorage.getItem("username");
  }, [userIdRef.current]);


  useEffect(() => {
    fetchRooms();
    return ()=> {
      setIsLoading(false);
      setRoomList([]);
    } 
  }, []);

  const enterRoom = async (customSessionId) => {
    setIsRoomHost({ roomName: customSessionId, isHost: false });
    const assessToken = Cookies.get("token");
    try {
      setIsLoading(true);
      setCurrSessionId(customSessionId);

      // 보낼때 post, 바디에 mode랑 방이름 넣어서 보내라.
      const response = await axios.post(API_URL + `/enter/${customSessionId}`,
        { userId: userIdRef.current }, {

        headers: { Authorization: `Bearer ${assessToken}` },
      });
      setTimeOfGamePlay(response.data.time);
      setInRoomState(2);
      setRoomGameModeName(response.data.mode);
      // TODO: 리스폰스로 넘어오는 값 response.data.mode/response.data.sessionId으로 라우팅
      router.push(`/room/${response.data.sessionId}`);
    } catch (error) {
      const { response } = error;
      if (response) {
        switch (response.status) {
          case 400:
            Swal.fire({
              icon: 'error',
              text: '인원이 가득 찼습니다.'
            })
            break;
          case 401:
            refreshToken();
            break;
          case 404:
            Swal.fire({
              icon: 'error',
              text: '없는 방입니다.'
            })
            router.reload();
            break;
          default:
            Swal.fire({
              icon: 'error',
              text: '알 수 없는 에러가 발생했습니다.'
            })
            router.reload();
        }
      }
    } 
  };

  const fetchRooms = async () => {
    const accessToken = Cookies.get("token");
    try {
      const response = await axios.get(API_URL + "/rooms", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      setRoomList([...roomList, ...response.data]);
    } catch (error) {
      console.log(error);
      const { response } = error;
      if (response) {
        //모달
        switch (response.status) {
          case 401:
            refreshToken();
            break;
          case 403:
            // 이전페이지로 리다이렉트
            Swal.fire({
              icon: 'error',
              text: '접근 권한이 없습니다.'
            })
            router.back();
            break;
          case 500:
            Swal.fire({
              icon: 'error',
              text: '서버 에러가 발생했습니다.'
            })
            break;
          default:
            Swal.fire({
              icon: 'error',
              text: '알 수 없는 에러가 발생했습니다.'
            });
        }
      }
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
  }
  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleRoomEnter = (roomId) => {
    enterRoom(roomId);
  };

  return (
    <div className="background-div">

      <LayoutAuthenticated>
        <title>MOFIT 멀티 게임</title>
        <Navbar>
          {isLoading &&
            <div className="loading-container">
              <Loading />
            </div>
          }

          <div className="tb-container flex-col items-center flex">

            <div className="mt-6 db-table flex ">
              <table className="w-full" style={{ overflow: 'auto' }} >
                <thead>
                  <tr className="text-white text-6xl">
                    <th className="w-4/12 py-2 px-4">방 제목</th>
                    <th className="w-3/12 py-2 px-4">모드</th>
                    <th className="w-3/12 py-2 px-4">인원</th>
                    <th className="w-2/12 py-2 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {roomList?.map((room) => (
                    <tr
                      key={room}
                      className="bg-gray-100 hover:bg-gray-200 transition-colors duration-200 text-5xl"
                    >
                      <td className="py-1 px-1 text-center font-bold">
                        {room.roomId}
                      </td>
                      <td className="py-1 px-1 text-center font-bold">
                        {room.mode}
                      </td>
                      <td className="py-1 px-1 text-center font-bold">
                        {room.participant}/2
                      </td>
                      <td className="py-3 px-3 text-32xl">
                        {room.status === "START" || room.participant === 2 ? (
                          <button className="text-white font-bold py-3 px-4 rounded-md mx-auto block bg-slate-400 w-22 " disabled>
                            {room.status === "START" ? "게임 중" : "가득 참"}
                          </button>
                        ) : (
                          <button className="text-white font-bold py-4 px-4 rounded-md mx-auto btn-1 block w-22 " onClick={() => { handleRoomEnter(room.roomId); }}>
                            참여하기
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="fixed right-64 top-3/4 mt-20">
                <button
                  className="w-28 h-28 text-white rounded-full flex items-center justify-center ml-auto shadow-xl btn-1"
                  onClick={handleOpenModal}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-28 w-28"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </button>
                <img className={"bg-img"} src="packMan.gif" />


              </div>
            </div>

          </div>
        </Navbar>
        <CreateRoomModal isOpen={isModalOpen} onClose={handleCloseModal} setIsLoading={setIsLoading} />
      </LayoutAuthenticated>
      <style jsx>{`

        .loading-container{
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh; /* 화면 전체를 커버하도록 설정 */
          width: 100vw;
        }
        .tb-container {
          margin: 0px auto;
          width: 1500px;
          height: 960px;
        }

        .background-div {
          background-image: url("background-img.jpg");
          background-size: cover;
          background-position: center;
          overflow: hidden;
          z-inex: -1;
        }

        table {
          background: linear-gradient(to right, #0096ff, #00d7ff);
        }

        .btn-1 {
          background: linear-gradient(0deg,
          rgba(6, 14, 131, 1) 0%,
          rgba(12, 25, 180, 1) 100%);
          border: none;
        }

        .btn-1:hover {
          background: rgb(0, 3, 255);
          background: linear-gradient(0deg,
          rgba(0, 3, 255, 1) 0%,
          rgba(2, 126, 251, 1) 100%);
        }

        table tr {
          border-bottom: 1px solid #e5e5e5;
        }

        td {
        }

        .bg-img {
          position: relative;
          top: -120px;
          right: 1400px;

        }
        .db-table{
          width: 1500px;
        }

      `}</style>
    </div>
  );
}
